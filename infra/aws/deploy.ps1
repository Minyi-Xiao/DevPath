param(
  [string]$KeyPath,
  [string]$Region = $env:AWS_REGION,
  [string]$StackName = 'devpath',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

if (-not $Region) {
  $Region = 'ap-southeast-2'
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$envPath = Join-Path $PSScriptRoot '.env'
$envExample = Join-Path $PSScriptRoot 'env.example'

aws sts get-caller-identity --region $Region | Out-Null

$outputs = aws cloudformation describe-stacks `
  --region $Region `
  --stack-name $StackName `
  --query 'Stacks[0].Outputs' `
  --output json | ConvertFrom-Json

function Get-Output([string]$key) {
  ($outputs | Where-Object { $_.OutputKey -eq $key }).OutputValue
}

$publicIp = Get-Output PublicIp
$ecrUri = Get-Output EcrUri
$instanceId = Get-Output InstanceId
if (-not $publicIp -or -not $ecrUri -or -not $instanceId) {
  throw "Stack '$StackName' is missing PublicIp, EcrUri, or InstanceId. Run bootstrap.ps1 first."
}

if (-not (Test-Path $envPath)) {
  Copy-Item $envExample $envPath
}

function Read-EnvFile([string]$path) {
  $map = [ordered]@{}
  foreach ($line in Get-Content $path) {
    if ($line -match '^\s*#' -or $line -notmatch '=') {
      continue
    }
    $parts = $line.Split('=', 2)
    $map[$parts[0].Trim()] = $parts[1]
  }
  return $map
}

function Write-EnvFile([string]$path, $map) {
  $lines = foreach ($key in $map.Keys) {
    "$key=$($map[$key])"
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllLines($path, [string[]]$lines, $utf8)
}

function New-Secret([int]$length = 48) {
  $bytes = New-Object byte[] $length
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', 'x').Replace('/', 'y').Substring(0, $length)
}

$envMap = Read-EnvFile $envPath
if (-not $envMap['JWT_SECRET'] -or $envMap['JWT_SECRET'].Length -lt 32) {
  $envMap['JWT_SECRET'] = New-Secret 48
}
if (-not $envMap['POSTGRES_PASSWORD']) {
  $envMap['POSTGRES_PASSWORD'] = New-Secret 32
}
if (-not $envMap['CLIENT_URL'] -or $envMap['CLIENT_URL'] -match 'REPLACE_WITH_ELASTIC_IP') {
  $envMap['CLIENT_URL'] = "http://$publicIp"
}
if (-not $envMap['SITE_ADDRESS']) {
  $envMap['SITE_ADDRESS'] = ':80'
}
if (-not $envMap['AUTH_COOKIE_SECURE']) {
  $envMap['AUTH_COOKIE_SECURE'] = 'false'
}
$envMap['ECR_IMAGE'] = "${ecrUri}:latest"
$envMap['AWS_REGION'] = $Region
Write-EnvFile $envPath $envMap

if (-not $envMap['OPENAI_API_KEY']) {
  Write-Warning 'OPENAI_API_KEY is empty. Document analysis and practice generation will fail until you set it and redeploy.'
}

if (-not $envMap['SITE_ACCESS_PASSWORD']) {
  Write-Warning 'SITE_ACCESS_PASSWORD is empty. Anyone who finds the public URL can register and use the AI features.'
}

if (-not $SkipBuild) {
  $account = aws sts get-caller-identity --query Account --output text
  $registry = "$account.dkr.ecr.$Region.amazonaws.com"
  Write-Host "Logging in to ECR $registry ..."
  aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $registry
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker login to ECR failed.'
  }

  Write-Host "Building ${ecrUri}:latest ..."
  docker build --platform linux/amd64 -t "${ecrUri}:latest" $repoRoot
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker build failed.'
  }

  docker push "${ecrUri}:latest"
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker push failed.'
  }
}

$az = (aws ec2 describe-instances --region $Region --instance-ids $instanceId --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' --output text).Trim()
$icKey = Join-Path $env:TEMP "devpath-ic-$PID"
Remove-Item $icKey, "$icKey.pub" -ErrorAction SilentlyContinue
& ssh-keygen -t ed25519 -f $icKey -N ([string]::Empty) -q
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $icKey)) {
  throw 'ssh-keygen failed. Confirm OpenSSH is installed on Windows.'
}

function Send-InstanceConnectKey {
  $pub = (Get-Content -Raw "$icKey.pub").Trim()
  aws ec2-instance-connect send-ssh-public-key --region $Region --instance-id $instanceId --availability-zone $az --instance-os-user ec2-user --ssh-public-key $pub | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'EC2 Instance Connect failed.'
  }
}

$ssh = @('-i', $icKey, '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=20', "ec2-user@$publicIp")

Write-Host 'Waiting for SSH via Instance Connect...'
$ready = $false
foreach ($attempt in 1..36) {
  Send-InstanceConnectKey
  ssh @ssh 'echo ready' | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 5
}
if (-not $ready) {
  throw "Could not SSH to $publicIp. Check the instance status and that port 22 allows your IP."
}

Write-Host 'Waiting for Docker on the instance...'
$dockerReady = @'
set -euo pipefail
for i in $(seq 1 60); do
  if [ -f /etc/devpath.conf ] && command -v docker >/dev/null && docker info >/dev/null 2>&1; then
    echo ready
    exit 0
  fi
  sleep 5
done
echo 'Docker or /etc/devpath.conf is not ready after 5 minutes' >&2
exit 1
'@
Send-InstanceConnectKey
$dockerReady | ssh @ssh 'bash -s'
if ($LASTEXITCODE -ne 0) {
  throw 'Instance user-data has not finished installing Docker yet. Wait a minute and rerun deploy.ps1 -SkipBuild if the image is already in ECR.'
}

Send-InstanceConnectKey
ssh @ssh 'sudo mkdir -p /opt/devpath/infra/aws /data/uploads /data/postgres /data/caddy && sudo chown -R ec2-user:ec2-user /opt/devpath /data/uploads'
Send-InstanceConnectKey
scp -i $icKey -o StrictHostKeyChecking=accept-new `
  (Join-Path $repoRoot 'docker-compose.aws.yml') `
  "ec2-user@${publicIp}:/opt/devpath/docker-compose.aws.yml"
Send-InstanceConnectKey
scp -i $icKey -o StrictHostKeyChecking=accept-new `
  (Join-Path $repoRoot 'infra\aws\Caddyfile') `
  "ec2-user@${publicIp}:/opt/devpath/infra/aws/Caddyfile"
Send-InstanceConnectKey
scp -i $icKey -o StrictHostKeyChecking=accept-new `
  $envPath `
  "ec2-user@${publicIp}:/opt/devpath/.env"

$remote = @'
set -euo pipefail
for i in $(seq 1 60); do
  if [ -f /etc/devpath.conf ] && command -v docker >/dev/null && docker info >/dev/null 2>&1; then
    break
  fi
  sleep 5
done
# shellcheck disable=SC1091
. /etc/devpath.conf
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_URI"
cd /opt/devpath
docker compose -f docker-compose.aws.yml pull
docker compose -f docker-compose.aws.yml up -d
'@

Send-InstanceConnectKey
$remote | ssh @ssh 'bash -s'
if ($LASTEXITCODE -ne 0) {
  throw 'Remote compose up failed.'
}

Write-Host 'Waiting for /api/health ...'
$healthy = $false
foreach ($attempt in 1..30) {
  try {
    $response = Invoke-WebRequest -Uri "http://$publicIp/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
      $healthy = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 4
  }
}

Write-Host ''
if ($healthy) {
  Write-Host "DevPath is up: http://$publicIp"
} else {
  Write-Warning "Deploy finished but /api/health is not ready yet. Check instance i- logs with: aws ssm start-session --target $instanceId --region $Region"
}

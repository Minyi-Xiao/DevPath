param(
  [Parameter(Mandatory = $true)]
  [string]$KeyName,

  [string]$Region = $env:AWS_REGION,
  [string]$StackName = 'devpath',
  [string]$InstanceType = 't3.small',
  [string]$AllowedSshCidr = '0.0.0.0/0',
  [string]$KeyOutDir
)

$ErrorActionPreference = 'Stop'

if (-not $PSScriptRoot) {
  throw 'Run this script as a file: .\infra\aws\bootstrap.ps1 -KeyName devpath'
}

if (-not $KeyOutDir) {
  $KeyOutDir = $PSScriptRoot
}

if (-not $Region) {
  $Region = 'ap-southeast-2'
}

function Invoke-Aws {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AwsArgs)
  & aws @AwsArgs
  if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI failed: aws $($AwsArgs -join ' ')"
  }
}

try {
  Invoke-Aws sts get-caller-identity --region $Region | Out-Null
} catch {
  throw 'AWS credentials are not configured. Run `aws configure` (or `aws login`) first, then set a default region such as ap-southeast-2.'
}

$pemPath = Join-Path $KeyOutDir "$KeyName.pem"
$previous = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
aws ec2 describe-key-pairs --region $Region --key-names $KeyName 2>$null | Out-Null
$keyExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $previous

if ($keyExists) {
  Write-Host "Using existing key pair '$KeyName'."
  if (-not (Test-Path $pemPath)) {
    Write-Warning "AWS has '$KeyName' but $pemPath is missing. Use the original .pem with deploy.ps1."
  }
} else {
  Write-Host "Creating key pair '$KeyName'..."
  $material = aws ec2 create-key-pair --region $Region --key-name $KeyName --query KeyMaterial --output text
  if ($LASTEXITCODE -ne 0 -or -not $material) {
    throw 'Failed to create EC2 key pair.'
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  $normalized = ($material -replace "`r`n", "`n" -replace "`r", "`n").Trim() + "`n"
  [System.IO.File]::WriteAllText($pemPath, $normalized, $utf8)
  icacls $pemPath /inheritance:r | Out-Null
  icacls $pemPath /grant:r "$($env:USERNAME):R" | Out-Null
  Write-Host "Private key written to $pemPath"
}
$template = Join-Path $PSScriptRoot 'cloudformation.yml'

Write-Host "Deploying CloudFormation stack '$StackName' in $Region..."
aws cloudformation deploy `
  --region $Region `
  --stack-name $StackName `
  --template-file $template `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides `
  KeyName=$KeyName `
  InstanceType=$InstanceType `
  AllowedSshCidr=$AllowedSshCidr

if ($LASTEXITCODE -ne 0) {
  throw 'CloudFormation deploy failed.'
}

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
$siteUrl = Get-Output CloudFrontUrl
if (-not $siteUrl) {
  $siteUrl = Get-Output SiteUrl
}

Write-Host ''
Write-Host 'Stack is ready.'
Write-Host "  Public IP : $publicIp"
Write-Host "  Instance  : $instanceId"
Write-Host "  ECR       : $ecrUri"
Write-Host "  Site URL  : $siteUrl"
Write-Host "  SSH       : ssh -i `"$pemPath`" ec2-user@$publicIp"
Write-Host ''
Write-Host 'CloudFront HTTPS can take several minutes the first time the distribution is created.'
Write-Host 'Next:'
Write-Host '  1. Copy infra/aws/env.example to infra/aws/.env and set OPENAI_API_KEY'
Write-Host "  2. .\infra\aws\deploy.ps1 -KeyPath `"$pemPath`" -Region $Region"

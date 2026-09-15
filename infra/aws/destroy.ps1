param(
  [string]$Region = $env:AWS_REGION,
  [string]$StackName = 'devpath'
)

$ErrorActionPreference = 'Stop'

if (-not $Region) {
  $Region = 'ap-southeast-2'
}

Write-Host "Deleting CloudFormation stack '$StackName' in $Region..."
aws cloudformation delete-stack --region $Region --stack-name $StackName
aws cloudformation wait stack-delete-complete --region $Region --stack-name $StackName
Write-Host 'Stack deleted. ECR images and the Elastic IP are gone with it.'

# Deploy campus-placement-multiuser to Vercel production (this script's folder).
Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"

$tokenFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.vercel.local"
if (Test-Path $tokenFile) {
    $env:VERCEL_TOKEN = (Get-Content $tokenFile | Where-Object { $_ -match '^VERCEL_TOKEN=' }) -replace 'VERCEL_TOKEN=', ''
} elseif (Test-Path (Join-Path $PSScriptRoot ".env.vercel.local")) {
    $env:VERCEL_TOKEN = (Get-Content (Join-Path $PSScriptRoot ".env.vercel.local") | Where-Object { $_ -match '^VERCEL_TOKEN=' }) -replace 'VERCEL_TOKEN=', ''
}

Write-Host "Deploying $(Get-Location) to Vercel production..."
npx vercel --prod --yes
exit $LASTEXITCODE

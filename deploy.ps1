# Deploy this folder to its own Vercel project using its own token (ignores global login).
Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"
$expectedAccount = "lawcarelegal20-6778"
$tokenFile = Join-Path $PSScriptRoot ".env.vercel.local"
if (-not (Test-Path $tokenFile)) { throw ".env.vercel.local (VERCEL_TOKEN=...) not found in $PSScriptRoot" }
$token = ((Get-Content $tokenFile | Where-Object { $_ -match '^VERCEL_TOKEN=' }) -replace '^VERCEL_TOKEN=', '').Trim()
if (-not $token -or $token -eq 'PASTE_HERE') { throw "VERCEL_TOKEN is empty in $tokenFile" }
if (-not (Test-Path (Join-Path $PSScriptRoot ".vercel\project.json"))) { throw "Not linked: run npx vercel link --token <token>" }
$env:VERCEL_TOKEN = $token
# Windows PowerShell turns native stderr into terminating errors under "Stop".
$ErrorActionPreference = "Continue"
$who = "$(npx vercel whoami --token $token 2>$null | Select-Object -Last 1)".Trim()
$ErrorActionPreference = "Stop"
if ($who -ne $expectedAccount) {
  throw "Vercel account is '$who', expected '$expectedAccount'. Check the token in .env.vercel.local."
}
Write-Host "Account for this folder: $who"
Write-Host "Deploying $(Get-Location) to Vercel production..."
npx vercel --prod --yes --token $token
exit $LASTEXITCODE

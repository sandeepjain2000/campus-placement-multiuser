# Deploy this folder to the PlacementHub Vercel account. Uses .env.vercel.local only.
# Do not keep a .vercel folder, and do not run the vercel command yourself.
Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"
$expectedAccount = "lawcarelegal20-6778"
$vercelTeam = "team_V6vifspzo3RBFnyj31SLQgvU"
$vercelProject = "prj_dcHlixgm3ZZsiXlLKRT5OKeH2ewY"
$tokenFile = Join-Path $PSScriptRoot ".env.vercel.local"
$linkDir = Join-Path $PSScriptRoot ".vercel"
if (-not (Test-Path $tokenFile)) { throw ".env.vercel.local (VERCEL_TOKEN=...) not found in $PSScriptRoot" }
$token = ((Get-Content $tokenFile | Where-Object { $_ -match '^VERCEL_TOKEN=' }) -replace '^VERCEL_TOKEN=', '').Trim()
if (-not $token -or $token -eq 'PASTE_HERE') { throw "VERCEL_TOKEN is empty in $tokenFile" }
$env:VERCEL_TOKEN = $token

function Remove-VercelLink {
  if (Test-Path -LiteralPath $linkDir) {
    Remove-Item -LiteralPath $linkDir -Recurse -Force
  }
}

# Windows PowerShell turns native stderr into terminating errors under "Stop".
$ErrorActionPreference = "Continue"
$who = "$(npx vercel whoami --token $token 2>$null | Select-Object -Last 1)".Trim()
$ErrorActionPreference = "Stop"
if ($who -ne $expectedAccount) {
  throw "Vercel account is '$who', expected '$expectedAccount'. Check the token in .env.vercel.local."
}

Remove-VercelLink
$exitCode = 1
try {
  $ErrorActionPreference = "Continue"
  & npx vercel link --yes --team $vercelTeam --project $vercelProject --token $token
  if ($LASTEXITCODE -ne 0) { throw "vercel link failed with exit $LASTEXITCODE" }
  $linked = Get-Content -Raw (Join-Path $linkDir "project.json") | ConvertFrom-Json
  if ($linked.projectId -ne $vercelProject -or $linked.orgId -ne $vercelTeam) {
    throw "Refusing to deploy. The link is not the PlacementHub project."
  }
  $ErrorActionPreference = "Stop"
  Write-Host "Account for this folder: $who"
  Write-Host "Deploying $(Get-Location) to Vercel production..."
  $ErrorActionPreference = "Continue"
  & npx vercel --prod --yes --token $token
  $exitCode = $LASTEXITCODE
}
finally {
  Remove-VercelLink
}
exit $exitCode

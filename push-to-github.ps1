param(
    [Parameter(Position = 0)]
    [string]$Message = "Update campus-placement UI migration",

    [switch]$SkipAdd
)

# Always run inside campus-placement-multiuser (this script's folder).
Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"

Write-Host "Repo: $(git rev-parse --show-toplevel)"
Write-Host "Branch: $(git branch --show-current)"
Write-Host ""

# Ensure push is enabled toward GitHub
$pushUrl = git remote get-url --push origin 2>$null
if ($pushUrl -eq "DISABLED" -or [string]::IsNullOrWhiteSpace($pushUrl)) {
    Write-Host "Re-enabling origin push URL..."
    git remote set-url --push origin "https://github.com/sandeepjain2000/campus-placement-multiuser.git"
}

if (-not $SkipAdd) {
    git add -A
}

$status = git status --porcelain
if (-not $status) {
    Write-Host "Nothing to commit. Pushing current branch..."
    git push -u origin HEAD
    exit $LASTEXITCODE
}

Write-Host "Changes to commit:"
git status --short
Write-Host ""

git commit -m $Message
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git push -u origin HEAD
exit $LASTEXITCODE

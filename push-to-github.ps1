param(
    [Parameter(Position = 0)]
    [string]$Message = "Update campus-placement",

    [switch]$SkipAdd
)

Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"

Write-Host "Repo: $(git rev-parse --show-toplevel)"
Write-Host "Branch: $(git branch --show-current)"
Write-Host ""

if (-not $SkipAdd) {
    git add -A
}

$status = git status --porcelain
if (-not $status) {
    Write-Host "Nothing to commit. Pushing current branch..."
    git push
    exit $LASTEXITCODE
}

Write-Host "Changes to commit:"
git status --short
Write-Host ""

git commit -m $Message
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git push
exit $LASTEXITCODE

#Requires -Version 5.1
<#
.SYNOPSIS
  Update only the core Next.js application from origin. Does not wipe QA runners,
  test-case workbooks, help exports, mockups, or other non-app folders.

.DESCRIPTION
  1. git fetch
  2. Copy protected folders to backups\pull-protect-<timestamp>\
  3. git checkout origin/<branch> -- <app paths only>
  4. Restore protected folders from the backup (so pull cannot delete them)

  Never runs: git clean, git reset --hard, git push.

  Usage (from repo root or this folder):
    powershell -ExecutionPolicy Bypass -File scripts\pull-app-only.ps1
#>

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  if ($PSScriptRoot) {
    $parent = Split-Path -Parent $PSScriptRoot
    if (Test-Path (Join-Path $parent '.git')) { return $parent }
    if (Test-Path (Join-Path $PSScriptRoot '.git')) { return $PSScriptRoot }
  }
  $here = (Get-Location).Path
  if (Test-Path (Join-Path $here '.git')) { return $here }
  throw 'Run this script from the campus-placement repo (folder that contains .git).'
}

$Root = Resolve-RepoRoot
Set-Location $Root

Write-Host "Repo: $Root" -ForegroundColor Cyan

git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Not a git repository.' }

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if (-not $branch -or $branch -eq 'HEAD') { throw 'Detached HEAD — checkout a branch first.' }

$remote = 'origin'
$upstream = (git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $upstream) {
  $upstream = "$remote/$branch"
}

Write-Host "Branch: $branch" 
Write-Host "Fetch:  $remote  then checkout files from $upstream"

# Core application only (runtime / Next.js / DB schema the app needs).
# postcss.config.mjs is required for Tailwind v4; without it, AdminCN/login
# utilities like flex-col never compile and the UI collapses into one row.
$AppPaths = @(
  'src',
  'public',
  'db',
  'supabase',
  'package.json',
  'package-lock.json',
  'next.config.mjs',
  'postcss.config.mjs',
  'components.json',
  'securityHeaders.mjs',
  'jsconfig.json',
  'babel.config.js',
  'eslint.config.mjs',
  'vercel.json',
  'middleware.js',
  'src/middleware.js'
)

# Never checkout these from GitHub. Backup + restore so a fetch/checkout
# cannot remove runners, test-case xlsx, help, mockups, etc.
# Do not include 'scripts' (this file lives there) or 'backups' (destination).
$ProtectDirs = @(
  'qa',
  'qa2',
  'docs',
  'adhoc',
  '.cursor',
  'playwright-report',
  'test-results',
  'scratch',
  'prompts',
  'cybersecurity'
)

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $Root "backups\pull-protect-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

Write-Host "`nBacking up protected folders to:`n  $backupRoot" -ForegroundColor Yellow
foreach ($dir in $ProtectDirs) {
  $src = Join-Path $Root $dir
  if (-not (Test-Path $src)) { continue }
  $dest = Join-Path $backupRoot $dir
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Write-Host "  copy $dir"
  Copy-Item -Path $src -Destination $dest -Recurse -Force
}

Write-Host "`nFetching $remote ..." -ForegroundColor Cyan
git fetch $remote
if ($LASTEXITCODE -ne 0) { throw 'git fetch failed.' }

git rev-parse --verify "$upstream^{commit}" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Upstream '$upstream' not found after fetch. Check branch name / remote."
}

$existing = @()
foreach ($p in $AppPaths) {
  $full = Join-Path $Root $p
  $inIndex = git ls-tree --name-only "$upstream" -- $p 2>$null
  if ((Test-Path $full) -or $inIndex) { $existing += $p }
}

if ($existing.Count -eq 0) { throw 'No core application paths found to update.' }

Write-Host "`nUpdating application paths from $upstream :" -ForegroundColor Cyan
$existing | ForEach-Object { Write-Host "  $_" }

git checkout $upstream -- @existing
if ($LASTEXITCODE -ne 0) { throw 'git checkout of application paths failed.' }

Write-Host "`nRestoring protected folders (runners, test cases, docs, QA) ..." -ForegroundColor Yellow
foreach ($dir in $ProtectDirs) {
  $bak = Join-Path $backupRoot $dir
  $dest = Join-Path $Root $dir
  if (-not (Test-Path $bak)) { continue }
  if (Test-Path $dest) {
    Remove-Item -Path $dest -Recurse -Force
  }
  Copy-Item -Path $bak -Destination $dest -Recurse -Force
  Write-Host "  restored $dir"
}

Write-Host "`nDone. Application files match $upstream." -ForegroundColor Green
Write-Host "Protected folders were restored from backup (not updated from GitHub)."
Write-Host "Backup kept at: $backupRoot"
Write-Host "`n.git history (HEAD) was not moved. Working tree app files were updated."
Write-Host "Next: npm install   then   npm run dev"
Write-Host "`ngit status (short):"
git status -sb

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDir,

  [string[]]$Keys,

  [switch]$ListOnly,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Resolve-ProjectPath {
  param([string]$RelativePath)
  Join-Path (Get-Location) $RelativePath
}

$resolvedBackupDir = Resolve-Path $BackupDir
$mapPath = Join-Path $resolvedBackupDir "restore-map.json"

if (-not (Test-Path $mapPath)) {
  throw "restore-map.json not found in backup dir: $resolvedBackupDir"
}

$map = Get-Content $mapPath | ConvertFrom-Json
$entries = @()

foreach ($p in $map.PSObject.Properties) {
  $entries += [PSCustomObject]@{
    Key = $p.Name
    Backup = [string]$p.Value.backup
    Target = [string]$p.Value.target
  }
}

if ($ListOnly) {
  Write-Host "Available restore keys in $resolvedBackupDir"
  $entries | Sort-Object Key | Format-Table Key, Backup, Target -AutoSize
  exit 0
}

if (-not $Keys -or $Keys.Count -eq 0) {
  throw "No keys provided. Use -ListOnly to see available keys, then pass -Keys key1,key2"
}

$selected = @()
foreach ($k in $Keys) {
  $hit = $entries | Where-Object { $_.Key -eq $k }
  if (-not $hit) {
    throw "Unknown key '$k'. Use -ListOnly to view valid keys."
  }
  $selected += $hit
}

foreach ($item in $selected) {
  $source = Join-Path $resolvedBackupDir $item.Backup
  $dest = Resolve-ProjectPath $item.Target

  if (-not (Test-Path $source)) {
    throw "Backup file missing: $source"
  }

  $destDir = Split-Path -Parent $dest
  if (-not (Test-Path $destDir)) {
    throw "Destination directory missing: $destDir"
  }

  if ($DryRun) {
    Write-Host "[DryRun] Would restore '$($item.Key)':"
    Write-Host "         $source"
    Write-Host "         -> $dest"
    continue
  }

  Copy-Item $source $dest -Force
  Write-Host "Restored '$($item.Key)' -> $($item.Target)"
}

Write-Host "Selective restore complete."

# Guided manual test runner (PowerShell).
# Example: .\qa\runners\batch\run-guided.ps1 --playbook internships-employer-publish

$BatchDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $BatchDir "..\..\..")).Path
$Runner = Join-Path $ProjectRoot "qa\runners\guided\run-guided.mjs"

if (-not (Test-Path $Runner)) {
    Write-Error "Runner not found at $Runner."
    exit 1
}

Set-Location $ProjectRoot
node $Runner @args

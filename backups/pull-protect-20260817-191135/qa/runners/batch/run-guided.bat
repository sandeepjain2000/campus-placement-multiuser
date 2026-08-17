@echo off
REM Guided manual test runner — run from repo root via npm scripts or this launcher.
REM Example: qa\runners\batch\run-guided.bat --playbook internships-full-cycle

call "%~dp0_cd-repo-root.bat"
if not exist "qa\runners\guided\run-guided.mjs" (
  echo ERROR: qa\runners\guided\run-guided.mjs not found.
  exit /b 1
)
node qa\runners\guided\run-guided.mjs %*

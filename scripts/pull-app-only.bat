@echo off
setlocal
REM Update core application from GitHub only.
REM Does not delete/update qa runners, docs\test-cases, help, mockups, etc.
REM See scripts\pull-app-only.ps1

cd /d "%~dp0.."
if not exist ".git" (
  echo Run this from the repo, or keep this .bat next to pull-app-only.ps1 under scripts\
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pull-app-only.ps1"
set ERR=%ERRORLEVEL%
echo.
pause
exit /b %ERR%

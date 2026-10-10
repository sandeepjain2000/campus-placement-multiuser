@echo off
setlocal
REM Deploy to Vercel production. Wrapper for deploy.ps1 in this same folder (repo root)
REM Usage: double-click, or: deploy.bat

cd /d "%~dp0"
if not exist "deploy.ps1" (
  echo deploy.ps1 not found in repo root.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\deploy.ps1"
set ERR=%ERRORLEVEL%
echo.
pause
exit /b %ERR%

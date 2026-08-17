@echo off
setlocal
REM Deploy to Vercel production. Wrapper for repo-root deploy.ps1
REM Usage: double-click, or: scripts\deploy.bat

cd /d "%~dp0.."
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

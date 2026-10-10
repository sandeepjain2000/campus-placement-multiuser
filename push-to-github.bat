@echo off
setlocal
REM Commit all changes and push to GitHub. Wrapper for push-to-github.ps1 (same folder)
REM Usage:
REM   push-to-github.bat
REM   push-to-github.bat "Your commit message"

cd /d "%~dp0"
if not exist "push-to-github.ps1" (
  echo push-to-github.ps1 not found in repo root.
  pause
  exit /b 1
)

if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\push-to-github.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\push-to-github.ps1" -Message "%*"
)
set ERR=%ERRORLEVEL%
echo.
pause
exit /b %ERR%

@echo off
call "%~dp0_cd-repo-root.bat"

if "%~1"=="" (
  echo.
  echo Usage: qa\runners\batch\run_use_case_auto_voice.bat ^<slug^>
  echo Example: qa\runners\batch\run_use_case_auto_voice.bat placement-drive-full
  echo.
  npm run test:guided:voice -- --help
  pause
  exit /b 1
)

echo.
echo Campus Placement — use case "%~1" with voice (no clicks)
echo.
echo Terminal 1: npm run dev
echo One-time: pip install -r qa\data\requirements\requirements-voice.txt
echo.
npm run test:guided:voice -- %1
pause

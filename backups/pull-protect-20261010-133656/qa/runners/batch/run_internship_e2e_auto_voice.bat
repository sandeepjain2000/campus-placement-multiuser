@echo off
call "%~dp0_cd-repo-root.bat"
echo.
echo Campus Placement — internship E2E with voice (no clicks)
echo.
echo Terminal 1: npm run dev
echo Terminal 2: this script
echo.
echo One-time: pip install -r qa\data\requirements\requirements-voice.txt
echo.
npm run test:guided:playbook-e2e-auto-voice
pause

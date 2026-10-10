@echo off
call "%~dp0_cd-repo-root.bat"
echo.
echo Campus Placement — internship guides, supervisors and feedback (voice, no clicks)
echo.
echo Prerequisite: at least one Selected intern (run qa\runners\batch\run_internship_apply_auto_voice.bat first if empty)
echo Terminal 1: npm run dev
echo One-time: pip install -r qa\data\requirements\requirements-voice.txt
echo.
npm run test:guided:voice-internship-care
pause

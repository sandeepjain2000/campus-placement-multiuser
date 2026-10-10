@echo off
call "%~dp0_cd-repo-root.bat"
echo.
echo Student apply + employer select — auto + voice
echo Terminal 1: npm run dev
echo.
npm run test:guided:playbook-apply-auto
pause

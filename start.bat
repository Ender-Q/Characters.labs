@echo off
title Character Labs
cd /d "%~dp0"

echo Starting Character Labs...
echo.

echo Starting Server (Port 5000)...
start "Character Labs Server" cmd /k "cd server && npm run dev"

echo Starting Client (Port 3000)...
start "Character Labs Client" cmd /k "cd client_new && npm run dev"

echo.
echo Character Labs is starting!
echo Server: http://localhost:5000
echo Client: http://localhost:3000
echo.
echo Close this window to stop.
pause
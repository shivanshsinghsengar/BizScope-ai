@echo off
echo Starting BizScope AI...
start "Backend" cmd /k "cd /d %~dp0backend && node server.js"
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both servers starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000

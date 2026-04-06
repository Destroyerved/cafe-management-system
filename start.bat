@echo off
title Cafe Management System
echo ===================================
echo Starting Cafe Management System
echo ===================================

echo.
echo Starting Backend...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo Starting Frontend...
start "Frontend Application" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting up!
echo - Frontend will run on http://localhost:5173
echo - Backend will run on http://localhost:3000
echo.
echo Keep the newly opened console windows open to see the server logs.
echo Press any key to exit this window...
pause >nul

@echo off
chcp 65001 >nul
title MA SOI ONLINE 2.5D
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Chua tim thay Node.js. Hay cai Node.js 20+ roi chay lai.
  echo https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo ================================
echo   MA SOI ONLINE 2.5D
necho ================================
echo Truy cap: http://localhost:3000
 echo Nhan Ctrl+C de dung server.
echo.
npm start
pause

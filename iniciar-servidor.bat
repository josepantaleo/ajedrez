@echo off
cls
title Servidor de Torneo LAN
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instalalo desde https://nodejs.org y volve a intentar.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias por primera vez, un momento...
  call npm install
  if errorlevel 1 (
    echo No se pudo instalar "ws". Revisa tu conexion a internet e intenta de nuevo.
    pause
    exit /b 1
  )
)

node lan-server.js

echo.
echo El servidor se detuvo.
pause

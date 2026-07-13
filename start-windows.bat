@echo off
setlocal
cd /d "%~dp0"
title KBKB Online Affiliatieformulier

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 run_local.py
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python run_local.py
  ) else (
    echo Python 3 is niet gevonden.
    echo Installeer Python 3 en vink tijdens de installatie "Add Python to PATH" aan.
    pause
    exit /b 1
  )
)

if not %errorlevel%==0 (
  echo.
  echo De lokale toepassing is onverwacht gestopt.
  pause
)
endlocal

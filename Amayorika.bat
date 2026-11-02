@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Amayorika - Windows Launcher
cd /d "%~dp0" || (echo [ERROR] Cannot open project directory.& pause& exit /b 1)
set "ROOT=%CD%"
set "LOGDIR=%ROOT%\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" 2>nul
set "LOG=%LOGDIR%\launcher.log"
echo.>>"%LOG%"
echo ===== Amayorika launch %DATE% %TIME% =====>>"%LOG%"
echo [INFO] Project: "%ROOT%"
if not exist "package.json" goto :noapp
if not exist ".runtime\third-party-install-status.json" (
 echo [INFO] Downloading third-party agent and memory sources...
 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\install-third-party.ps1" >>"%LOG%" 2>&1
 if errorlevel 1 echo [WARN] Some sources failed. See logs and retry with scripts\install-third-party.ps1
)
if not exist ".runtime\hermes\.installed" (
 echo [INFO] Installing Hermes Agent into project folder...
 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\install-hermes.ps1" >>"%LOG%" 2>&1
 if errorlevel 1 (
  echo [WARN] Hermes installation failed. Amayorika will still start.
  echo [WARN] See "%LOG%" for details.
 ) else (
  echo [INFO] Hermes installation completed.
 )
)
if not exist ".runtime\memos\.installed" (
 echo [INFO] Installing MemOS locally into .runtime\memos...
 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\install-memos.ps1" >>"%LOG%" 2>&1
 if errorlevel 1 (
  echo [WARN] MemOS installation failed. See logs\launcher.log
  echo [WARN] Amayorika will start without MemOS.
 ) else (
  echo [INFO] MemOS installation completed.
 )
)
if not exist ".runtime\project-golem\.installed" (
 echo [INFO] Downloading Project Golem into .runtime\project-golem...
 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\install-golem.ps1" >>"%LOG%" 2>&1
 if errorlevel 1 (
  echo [WARN] Project Golem download failed. See logs\launcher.log
 ) else (
  echo [INFO] Project Golem source downloaded.
 )
)
where node.exe >nul 2>&1
if errorlevel 1 goto :nonode
where npm.cmd >nul 2>&1
if errorlevel 1 goto :nonpm
for /f "delims=" %%V in ('node.exe --version 2^>nul') do echo [INFO] Node %%V
rem The current application has no external npm dependencies.
rem Install only when package.json declares dependencies.
node.exe -e "const p=require('./package.json');process.exit(Object.keys({...p.dependencies,...p.optionalDependencies,...p.devDependencies}).length?0:1)" >nul 2>&1
if not errorlevel 1 (
 if not exist "node_modules\." (
  echo [INFO] Installing dependencies...
  if exist "package-lock.json" (
   call npm.cmd ci --no-audit --no-fund >>"%LOG%" 2>&1
  ) else (
   call npm.cmd install --no-audit --no-fund >>"%LOG%" 2>&1
  )
  if errorlevel 1 goto :installfail
 )
) else (
 echo [INFO] No npm dependencies required. Skipping installation.
)
node.exe -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.start?0:1)" >nul 2>&1
if not errorlevel 1 (
 set "RUNSCRIPT=start"
 goto :run
)
node.exe -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.dev?0:1)" >nul 2>&1
if not errorlevel 1 (
 set "RUNSCRIPT=dev"
 goto :run
)
echo [ERROR] package.json has no start or dev script.
goto :fail
:run
echo [INFO] Starting npm.cmd run %RUNSCRIPT%
echo [INFO] Logs: "%LOG%"
call npm.cmd run %RUNSCRIPT% >>"%LOG%" 2>&1
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
 echo [ERROR] Application exited with code %EXITCODE%. See logs\launcher.log
 goto :fail
)
echo [INFO] Application stopped.
exit /b 0
:noapp
echo [INFO] Application source is not installed yet.
echo [INFO] Add package.json with a start or dev script to enable launch.
exit /b 0
:nonode
echo [ERROR] Node.js is missing. Install Node.js LTS and restart.
goto :fail
:nonpm
echo [ERROR] npm.cmd is missing. Repair Node.js installation.
goto :fail
:installfail
echo [ERROR] Dependency installation failed. Check logs\launcher.log
:fail
echo [ERROR] See "%LOG%"
pause
exit /b 1

@echo off
rem Doble clic para iniciar el narrador. Argumentos extra: iniciar.bat --monitor 2 --interval 8
cd /d "%~dp0"
if not exist ".env" copy ".env.example" ".env" >nul
"%USERPROFILE%\screen-narrator-venv\Scripts\python.exe" narrator.py %*
pause

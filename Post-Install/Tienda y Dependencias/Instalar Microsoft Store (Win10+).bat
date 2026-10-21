@echo off
title Instalar Microsoft Store

 :: BatchGotAdmin
REM  --> Check for permissions
    IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
>nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
)

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params= %*
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params:"=""%", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0"
	

echo.
echo ----------------------------------------------------
echo         Instalador de la tienda de microsoft
echo ----------------------------------------------------
echo.
echo Este archivo instalara la tienda de microsoft
echo Recuerda activar windows update luego de instalarla!
echo.
echo ----------------------------------------------------
echo.
pause
cls

:: Comprobar si ya existe la poronga esta
if exist "%TEMP%\Store.exe" (
	taskkill /f /im "Store.exe"
	del "%TEMP%\Store.exe"
	cls
)

:: Chequear si wget existe
where wget >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: No existe WGET! El script no se puede ejecutar sin esto.
    pause
    exit /b
) 

:: Descargar la tienda
echo Descargando la Tienda...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=5 -O "%TEMP%\Store.exe" "https://web.archive.org/web/20240623175744/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/Store.exe?download=true"

:: Comprobar si se descargo de manera correcta
if ERRORLEVEL 1 (
	cls
	echo Ocurrio un error al descargar la tienda. Comprueba si tienes el internet conectado y intentalo nuevamente
	pause
	exit
)

:: Instalar la tienda
:installstore
echo.
echo Instalando la Tienda...
start "" "%TEMP%\Store.exe"
exit
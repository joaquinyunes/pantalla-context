@echo off

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

:: Chequear si wget existe
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
) else (
	set WGET=wget
)

:: Avisar al usuario
title Solucionar Errores
echo --------------------------------------------------
echo                Solucionar Errores
echo --------------------------------------------------
echo.
echo Este script instalara todas las dependencias
echo necesarias para correr la mayoria de juegos
echo.
echo --------------------------------------------------
echo.
pause
cls

:: Comprobar si el sistema es de 32 o 64 Bits
if "%PROCESSOR_ARCHITECTURE%"=="x86" (
  goto 32Bits
) else (
  goto 64Bits
)

:32Bits
echo Instalando Visual C++ 2005...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2005_x86.exe" "https://web.archive.org/web/20240420231132/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2005_x86.exe?download=true"
"%TEMP%\vcredist2005_x86.exe" /q
echo Instalando Visual C++ 2008...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2008_x86.exe" "https://web.archive.org/web/20240420231121/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2008_x86.exe?download=true"
"%TEMP%\vcredist2008_x86.exe" /q /norestart
echo Instalando Visual C++ 2010...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2010_x86.exe" "https://web.archive.org/web/20240420231113/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2010_x86.exe?download=true"
"%TEMP%\vcredist2010_x86.exe" /install /passive
echo Instalando Visual C++ 2012...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2012_x86.exe" "https://web.archive.org/web/20240420231100/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2012_x86.exe?download=true"
"%TEMP%\vcredist2012_x86.exe" /install /passive
echo Instalando Visual C++ 2013...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2013_x86.exe" "https://web.archive.org/web/20240420231048/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2013_x86.exe?download=true"
"%TEMP%\vcredist2013_x86.exe" /install /passive
echo Instalando Visual C++ 2015 2017 2019 2022...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2015_2017_2019_x86.exe" "https://web.archive.org/web/20240420231038/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2015_2017_2019_x86.exe?download=true"
"%TEMP%\vcredist2015_2017_2019_x86.exe" /install /passive
echo Instalando DirectX...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\DirectX.exe" "https://web.archive.org/web/20240607192918/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/DirectX.exe?download=true"
"%TEMP%\DirectX.exe" /passive
echo Instalando NET Framework 4.5...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\NetFramework.exe" "https://web.archive.org/web/20240420235522/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/NDP452-KB2901907-x86-x64-AllOS-ENU.exe?download=true"
"%TEMP%\NetFramework.exe" /q /norestart

:64Bits
echo Instalando Visual C++ 2005...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2005_x86.exe" "https://web.archive.org/web/20240420231132/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2005_x86.exe?download=true"
"%TEMP%\vcredist2005_x86.exe" /q
:: No tengo link funcional de x64!
echo Instalando Visual C++ 2008...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2008_x86.exe" "https://web.archive.org/web/20240420231121/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2008_x86.exe?download=true"
"%TEMP%\vcredist2008_x86.exe" /q /norestart
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2008_x64.exe" "https://web.archive.org/web/20240420231128/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2008_x64.exe?download=true"
"%TEMP%\vcredist2008_x64.exe" /q /norestart
echo Instalando Visual C++ 2010...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2010_x86.exe" "https://web.archive.org/web/20240420231113/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2010_x86.exe?download=true"
"%TEMP%\vcredist2010_x86.exe" /install /passive
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2010_x64.exe" "https://web.archive.org/web/20240420231117/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2010_x64.exe?download=true"
"%TEMP%\vcredist2010_x64.exe" /install /passive
echo Instalando Visual C++ 2012...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2012_x86.exe" "https://web.archive.org/web/20240420231100/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2012_x86.exe?download=true"
"%TEMP%\vcredist2012_x86.exe" /install /passive
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2012_x64.exe" "https://web.archive.org/web/20240420231107/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2012_x64.exe?download=true"
"%TEMP%\vcredist2012_x64.exe" /install /passive
echo Instalando Visual C++ 2013...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2013_x86.exe" "https://web.archive.org/web/20240420231048/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2013_x86.exe?download=true"
"%TEMP%\vcredist2013_x86.exe" /install /passive
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2013_x64.exe" "https://web.archive.org/web/20240420231054/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2013_x64.exe?download=true"
"%TEMP%\vcredist2013_x64.exe" /install /passive
echo Instalando Visual C++ 2015 2017 2019 2022...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2015_2017_2019_x86.exe" "https://web.archive.org/web/20240420231038/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2015_2017_2019_x86.exe?download=true"
"%TEMP%\vcredist2015_2017_2019_x86.exe" /install /passive
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\vcredist2015_2017_2019_x64.exe" "https://web.archive.org/web/20240420231043/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/vcredist2015_2017_2019_x64.exe?download=true"
"%TEMP%\vcredist2015_2017_2019_x64.exe" /install /passive
echo Instalando DirectX...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\DirectX.exe" "https://web.archive.org/web/20240607192918/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/DirectX.exe?download=true"
"%TEMP%\DirectX.exe" /passive
echo Instalando NET Framework 4.5...
"%WGET%" -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\NetFramework.exe" "https://web.archive.org/web/20240420235522/https://huggingface.co/spaces/lozanogamer/lozanogamers/resolve/main/NDP452-KB2901907-x86-x64-AllOS-ENU.exe?download=true"
"%TEMP%\NetFramework.exe" /q /norestart
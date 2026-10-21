@echo off
title File Downloader

where 7z >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe 7z!
    pause
    exit /b 1
)

where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\CentBrowser.zip" "https://web.archive.org/web/20251127200705/https://static.centbrowser.com/win_stable/5.2.1168.83/centbrowser_5.2.1168.83_portable.exe"


if errorlevel 1 (
    echo ERROR: No se pudo descargar el archivo
    echo Verifica tu conexion a internet o intenta nuevamente
    pause
    exit /b 1
)

7z x "%TEMP%\CentBrowser.zip" -o"%CD%\Cent Browser 134 Portable 32 Bits"
del "%TEMP%\CentBrowser.zip"
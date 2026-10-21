@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=Brave108-32Bits.exe

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20251214042556/https://download1320.mediafire.com/pzsgwcvnimdgZf7c3SDw9MgtxqTUOhxK1v_cZX5ASP-_1Q1UdD1p3vjOqXmjIL_ZTWEzQPP4gZ-FHt1Mh3hofAjA4hNmDFyJKetKZ5OpT5TaYJXCQ9em5_iPTdNtpdmJzC4yz3hWk8LpOh_xJMHLKVfQhIYRfMACyPLcXTwEyPfWSg/zg6bsx49hdnx7b4/BraveBrowserStandaloneSetup32.exe"

:: si tu internet es una chota o el server esta caido tirar el error este
if errorlevel 1 (
    echo ERROR: No se pudo descargar el archivo
    echo Verifica tu conexion a internet o intenta nuevamente
    pause
    exit /b 1
)

:: iniciar el instalador
echo Iniciando el Archivo...
start /wait "" "%TEMP%\%EXE_NAME%"

:: borrarlo al choto para que lo queres?
echo Borrando el archivo...
del "%TEMP%\%EXE_NAME%"
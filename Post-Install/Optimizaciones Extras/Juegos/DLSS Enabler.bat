@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=DLSS Enabler.exe

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20260413044855/https://download1592.mediafire.com/xcr3lordfkxg2yiUdJs7B6fmdnMxeCSXsk8wyZNysVZADPHiNqCbMaPsBLFfggQ2347jQbMNC5L8gUIKiqA_QjBhIL1MAlJqmQqGtMk8HLHLCg8VNLy2wnDhUSrZlj1qSZH4gnKrFzB5or6DEKY827Ek9GN7ZacKhGl4eHqvotsQ_pY/7ovu39g8byubnhd/dlss-enabler-setup_0.9.0-final.20260401._AF.exe"

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
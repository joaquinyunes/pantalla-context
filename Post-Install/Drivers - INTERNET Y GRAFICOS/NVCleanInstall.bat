@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=NVClean Install.exe

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20260413013343/https://download1587.mediafire.com/95suraodgkagHlwLgk7_QpEhY2p30VjuEVttl9lpISm2or0sEfPBtdkxlZMLfhmKhHYAJgCeyz_LCxjBPIW1OmaL3_GmDR27vECgcimHrt_afmqmvTRdZbL2NvNKWHWn8-CNZFhWFLBUIW3yPtk7rzncS6_q8H_I9D1FXvloPkUp/h6bh09iykhw98oj/NVCleanstall_1.19.0.exe"

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
@echo off
title File Downloader

:: nombre del archivo para simplificar el choclo este
set FILE_NAME=PhotoshopCS6.7z
set FOLDER_NAME=PhotoshopCS6 - ABRIR ADMIN

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: la misma mierda pero para 7z, para descomprimir el archivo descargado
where 7z >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe 7z!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%FILE_NAME%" "https://web.archive.org/web/20240325004539/https://download2390.mediafire.com/r2f51m86gzygrVa8Ai00uR6C7XSk8dwFCNpOF4VrvowDX34LvAZK0elRq8_lZTCuVOzT70lSgw29LFxFNNPx1JHielU0UPPr2QzDttB6FxgZrlKh0XmvNyXlRHnaYyK0xhlItIcVihWGXp869v4X-9CLt8cq7oMPPfNfC5wv8T7rcA/wpysvclp68cq6p3/Photoshop+CS6.rar"

:: si tu internet es una chota o el server esta caido tirar el error este
if errorlevel 1 (
    echo ERROR: No se pudo descargar el archivo
    echo Verifica tu conexion a internet o intenta nuevamente
    pause
    exit /b 1
)

:: descomprimir el archivo descargado
echo Descomprimiendo el archivo...
7z -bsp1 x "%TEMP%\%FILE_NAME%" -o"%CD%\%FOLDER_NAME%" -y

:: si tu internet es una chota o el server esta caido tirar el error este
if errorlevel 1 (
    echo ERROR: No se pudo descomprimir el archivo
    echo El archivo puede estar corrupto o incompleto
    pause
    exit /b 1
)

:: iniciar la carpeta
start /wait "" "%CD%\%FOLDER_NAME%"

:: borrar el archivo comprimido al choto para que lo queres?
echo Borrando el archivo...
del "%TEMP%\%FILE_NAME%"
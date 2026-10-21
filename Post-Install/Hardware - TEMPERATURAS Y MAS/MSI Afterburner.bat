@echo off
title File Downloader

:: nombre del archivo para simplificar el choclo este
set FILE_NAME=MSI Afterburner Portable.7z
set FOLDER_NAME=MSI Afterburner Portable

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
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%FILE_NAME%" "https://web.archive.org/web/20240325004413if_/https://download1338.mediafire.com/kk8vbap5l3lgQy2_bnN9JIVbx82DTKor_PvCEAMD9NOK_B7S0ru5zC0y2VMAyi5cIPKYQTIza_LkqNlLTlZHDmYZrJ7Mqr-hSXXMqEIYf0vFXSyWwkdA_zUwkvR70Lmvrte8vJHS3D3xYu2EZ8n963O96GMjd23WYwCcGRhRwpWD4g/k8eqyj99bwlao4o/MSI+Afterburner+Portable.7z"

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
@echo off
title File Downloader

:: nombre del archivo para simplificar el choclo este
set FILE_NAME=CapCut3.8.7z
set FOLDER_NAME=CapCut 3.8

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
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%FILE_NAME%" "https://web.archive.org/web/20260413040828/https://download2393.mediafire.com/gpdfvy3exjzgcXNE4sCqv_FycBTNaQr2fVF7ILrDzvn4P-iivg5_o2GL7AJ2vB9ySk9MTNP0DpSBajQ6cSCvydpG1xn8oZ5fsJ1YyNw-OjnMJ4ZRpd8bgoK3fR3KOPSslHdTh6hIJn8G3Nc0nmQ9Yqf1aEMzNZkPhRinJXiUqwl7/jwi0n4my5kab9cr/CapCut+3.8.0+Opti.7z"

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
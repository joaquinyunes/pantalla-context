@echo off
title File Downloader

:: nombre del archivo para simplificar el choclo este
set FILE_NAME=LSE PRO.7z
set FOLDER_NAME=Low Specs Experience PRO

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
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%FILE_NAME%" "https://web.archive.org/web/20260413044209/https://download1589.mediafire.com/lvqtggljsp9gG2oFtfTAcyMOt_GF7lRo8skFqD-8frTcbiuQsqDYQKc-906tM565w0jM5ii95F6U1PxKV-4phZp1J2J5GyPCapRF4jKnG9zs8b6TtAJxnPqhWxiyLY2yMAArN0ITLPyQL-x1Fqvsb1W8Rw4GY1oax0aaYO6gkDT7DQ/tk5uazo08ltisub/Low+Specs+Experience+PRO.7z"

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
::7z -bsp1 x "%TEMP%\%FILE_NAME%" -y

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
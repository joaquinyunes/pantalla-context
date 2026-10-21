@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=Epic Installer.msi

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20260413032617/https://download941.mediafire.com/h6mhto8nccigwR6wwIJlFYG_Q4Z2J7GkVfBppihEI3u2r0BgosVbeDK7wOP0zsT2255oW0fsXrLDVvFiAX_gH5I5bZdlopPH7oGap1ahp3L4ZSfRe6Mq5wvnnpbUdslY7LuVzNH2h5OExIPNjKdheJfY9LU6rp_GkMJ5nKvM49TdkuI/c4r6640h3z5epm9/EpicInstaller-19.2.3.msi"

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
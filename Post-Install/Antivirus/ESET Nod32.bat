@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=ESET Nod32.exe

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20260413171533/https://dw.uptodown.net/dwn/3jecuB41fskXBmiJLcqd2C3Jh3gxl6wX5H7otS3qccI42wGvHKf7N4XLZqG-NBNjLp7G1eNr1aGe70GWUNDOQWOs6FOXuqKg7_L54O0RDpjno_AsQsNkYn15YBNeBzWd/mQl2RqD0uRpx9NvbiYZD_r_W7BpBHRABkpHwWbzyZuAHZhyyoMmvewGZbGbCt5L6ZippOK6x4rLFfvilql-9cEiNWETSsRE2I9QgH28C1GxKK3CDyxqyMGGHKUT16gtW/VN88ziEQ_U-8cCvjtw-I5YL7pGi9lwzlcJqnQjp6RGe4Ep_7NxR6BciDTpoNj5O9uF-K90TdYJp7pqH_MmxMXw==/nod32-antivirus-19-1-12-0.exe"

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
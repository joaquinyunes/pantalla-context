@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=Kaspersky.exe

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20260413171230/https://dw.uptodown.net/dwn/3jecuB41fskXBmiJLcqd2C3Jh3gxl6wX5H7otS3qccIla4c9SWtGyLuBQtp05HKLkH1XgRgsbRDMODBj1Sgz7AS-qwwRg-0Rd1bfACq046VqTHUYSbhI2l4sQbhNX30f/ce0tE_PD0tlfdhrV5NTg1Xq1dLZZgg2bWm57e3_r5EC-nIzujBgPp9llh3uMJTlVDh07vt9Ze_SdgRJ0W0zQ6a63HADmdsS2UiRLkbapYDUp7jDMJgoL0hX-i_7hJZx_/2PPrB9-0om7PpHdFqyRGgwWNWcJ_Ouupe_hq4Zl7nqFDyhWgDIDcEvpSbEjHuQma_O3VTVP50R_C7ghBfEWMPk7QDng9e88RI-ZFWW43h_E=/kaspersky-free-21-21-7-384.exe"

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
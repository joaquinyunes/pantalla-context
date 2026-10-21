@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=Brave108-64Bits.exe

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20251214042222/https://download1347.mediafire.com/plgpnzi5qtvg_aO-mwYnsrYRNfD5uIaUaQLqlj9T14G1EiCFyRqbMN8JVEWHPYP4-dBdK5kDsf8QiNPw3PLBeSAX0bWLAc_1kHSeilmYW4EC9bTCDJRjJRV4I0fRUXstHpMe82ysdHhKrrdW7o97kBvCoBzkY1VY81lGt15Xkx1iNw/774w5ul5vuco5r4/BraveBrowserStandaloneSetup.exe"

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
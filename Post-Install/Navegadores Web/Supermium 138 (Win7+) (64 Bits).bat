@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=supermium_138_64_setup.exe

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20251214043203/https://download1531.mediafire.com/odagfe0d9xlgkTF5MiPftFnaZjENrwcaxFagPJkRFP3YzqExrNUQlm9DoXkjVwp3gFZrrpzTuy4p3wMaWans8Bah9k6ftXL1eptlHQhKdXLnb57cAdeaHKRCcB6vPmhuLchMtiQK2mlKBrNRhCxymCBhCwtgg4u2152fNj9E2mZViOY/brxu2kq3znp8483/supermium_138_64_setup.exe"

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
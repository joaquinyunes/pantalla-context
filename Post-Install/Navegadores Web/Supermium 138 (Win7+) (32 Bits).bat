@echo off
title File Downloader

:: nombre del exe para simplificar el choclo este
set EXE_NAME=supermium_138_32_setup.exe

:: comprobar si no existe WGET (ponerlo en system32)
where wget >nul 2>&1
if errorlevel 1 (
    echo ERROR: No existe WGET!
    pause
    exit /b 1
)

:: descargar el choclo este
echo Descargando el Archivo...
wget -q --no-check-certificate --show-progress --connect-timeout=15 --tries=3 -O "%TEMP%\%EXE_NAME%" "https://web.archive.org/web/20251214043008/https://download1323.mediafire.com/lgfww7f3pdvggYVGhj9hSsmn5-4sIF8E-ypMe913--J0gS6tznkuCMYadlBHtqHyBXGJabQkWmdtkH7r80T-14LJmCbPK7KaVTiCWi44Sx0M2coBFuga7Z7dk_CNjbxwq5f5K3OAKDaFnDyO3FM_BlkoUkGBZnp-g763DzGuBT1t/zr89s1jf643qjej/supermium_138_32_setup.exe"

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
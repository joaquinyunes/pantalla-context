@echo off
cd /d "%~dp0\LighterData\bin\32bit"
start /abovenormal "" "obs32.exe" --disable-updater --portable --multi --allow-opengl

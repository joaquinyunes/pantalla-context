@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  Auto-elevacion UAC (compatible Win7/8/10/11)
:: ============================================================
IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
    >nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
    >nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
)
if '%errorlevel%' NEQ '0' (
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params= %*
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params:"=""%", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0"

:: ============================================================
echo  [01/28] Archivos recientes y Jump Lists...
:: ============================================================
del /f /q "%AppData%\Microsoft\Windows\Recent\*.*" 2>nul
for /d %%D in ("%AppData%\Microsoft\Windows\Recent\*") do rd /s /q "%%D" 2>nul
del /f /q "%AppData%\Microsoft\Windows\Recent\AutomaticDestinations\*.*" 2>nul
del /f /q "%AppData%\Microsoft\Windows\Recent\CustomDestinations\*.*" 2>nul
del /f /q "%AppData%\Microsoft\Windows\Start Menu\*.lnk" 2>nul
echo  OK

:: ============================================================
echo  [02/28] Registro - Explorer MRU, Bags, Streams, UserAssist...
:: ============================================================
set BASE=HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer
reg delete "%BASE%\RunMRU"                                    /f >nul 2>&1
reg delete "%BASE%\TypedPaths"                                /f >nul 2>&1
reg delete "%BASE%\RecentDocs"                                /f >nul 2>&1
reg delete "%BASE%\ComDlg32\OpenSavePidlMRU"                  /f >nul 2>&1
reg delete "%BASE%\ComDlg32\LastVisitedPidlMRU"               /f >nul 2>&1
reg delete "%BASE%\ComDlg32\CIDSizeMRU"                       /f >nul 2>&1
reg delete "%BASE%\ComDlg32\FirstFolder"                      /f >nul 2>&1
reg delete "%BASE%\ComDlg32\OpenSaveMRU"                      /f >nul 2>&1
reg delete "%BASE%\WordWheelQuery"                            /f >nul 2>&1
reg delete "%BASE%\StreamMRU"                                 /f >nul 2>&1
reg delete "%BASE%\Streams"                                   /f >nul 2>&1
reg delete "%BASE%\Map Network Drive MRU"                     /f >nul 2>&1
reg delete "%BASE%\FindComputerMRU"                           /f >nul 2>&1
reg delete "%BASE%\PrnPortsMRU"                               /f >nul 2>&1
reg delete "%BASE%\SearchRecent"                              /f >nul 2>&1
reg delete "%BASE%\FolderTypes"                               /f >nul 2>&1
reg delete "%BASE%\FeatureUsage"                              /f >nul 2>&1
reg delete "%BASE%\BagMRU"                                    /f >nul 2>&1
reg delete "%BASE%\Bags"                                      /f >nul 2>&1
reg delete "%BASE%\MountPoints2"                              /f >nul 2>&1
reg delete "%BASE%\UserAssist"                                /f >nul 2>&1
reg delete "%BASE%\TrayNotify"                                /f >nul 2>&1
reg delete "%BASE%\StartPage"                                 /f >nul 2>&1
reg delete "%BASE%\StartPage2"                                /f >nul 2>&1
reg delete "%BASE%\HideDesktopIcons"                          /f >nul 2>&1
reg delete "%BASE%\ControlPanel\NameSpace\DelegateFolders"    /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\Shell\BagMRU"    /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\Shell\Bags"      /f >nul 2>&1
reg delete "HKCU\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\ShellNoRoam\MUICache"                           /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\DiscardedByUser"        /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\SessionInfo"             /f >nul 2>&1
reg delete "HKLM\SYSTEM\ControlSet001\Services\bam\State\UserSettings"           /f >nul 2>&1
reg delete "HKLM\SYSTEM\ControlSet002\Services\bam\State\UserSettings"           /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\bam\State\UserSettings"       /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\UFH\SHC"              /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths"            /f >nul 2>&1
reg delete "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths" /f >nul 2>&1
echo  OK

:: ============================================================
echo  [03/28] Registro - Busqueda, privacidad y telemetria usuario...
:: ============================================================
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Search"             /v "SearchHistory" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\ActivityDataModel"                     /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\AppHost\AppRegistrationTimestamp"      /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\PushNotifications"                     /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Privacy"                               /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo"                       /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains"     /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Ranges"      /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Diagnostics"                           /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store"                      /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"           /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\DeviceAccess"                          /f >nul 2>&1
echo  OK

:: ============================================================
echo  [04/28] Registro - AppCompat, impresoras, credenciales, RDP...
:: ============================================================
reg delete "HKCU\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Compatibility Assistant\Store" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers"                        /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows NT\CurrentVersion\PrinterPorts"                                 /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Devices"                                      /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Windows\Device"                               /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Network\Persistent Connections"               /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Terminal Server Client\Default"                                         /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Terminal Server Client\Servers"                                         /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Terminal Server Client\LocalDevices"                                    /f >nul 2>&1
echo  OK

:: ============================================================
echo  [05/28] Registro - Portapapeles, IME y entrada...
:: ============================================================
reg delete "HKCU\Software\Microsoft\Clipboard"                                     /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\InputPersonalization\TrainedDataStore"          /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\InputPersonalization\PointOfInterest"           /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\InputApp"                                       /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Input\Settings"                                 /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Input\TouchKeyboard"                            /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\TabletTip\1.7"                                  /f >nul 2>&1
echo  OK

:: ============================================================
echo  [06/28] Registro - Internet Explorer / Edge legacy...
:: ============================================================
reg delete "HKCU\Software\Microsoft\Internet Explorer\TypedURLs"                      /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\TypedURLsTime"                  /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\Download Directory"             /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\Main\WindowTitle"               /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\Main"       /v "Use FormSuggest" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\IntelliForms"                   /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\Safety\PrivacIE"               /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\Safety\SiteDiscovery"           /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\SearchScopes"                   /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Internet Explorer\LowRegistry\Audio\PolicyConfig" /f >nul 2>&1
echo  OK

:: ============================================================
echo  [07/28] Registro - Office MRU (todas las versiones)...
:: ============================================================
for %%V in (11.0 12.0 14.0 15.0 16.0 17.0) do (
    reg delete "HKCU\Software\Microsoft\Office\%%V\Word\File MRU"                  /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Word\Place MRU"                 /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Word\Reading Locations"         /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Excel\File MRU"                 /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Excel\Place MRU"                /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\PowerPoint\File MRU"            /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\PowerPoint\Place MRU"           /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Access\File MRU"                /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Publisher\File MRU"             /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Visio\File MRU"                 /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Project\File MRU"               /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\OneNote\File MRU"               /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Common\Open Find"               /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Common\Internet"                /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Common\General" /v "RecentFiles"   /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Common\General" /v "RecentFolders" /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Outlook\Search"                 /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\Office\%%V\Outlook\AutoComplete"           /f >nul 2>&1
)
echo  OK

:: ============================================================
echo  [08/28] Registro - Apps de terceros comunes...
:: ============================================================
reg delete "HKCU\Software\7-Zip\FM"                                                    /f >nul 2>&1
reg delete "HKCU\Software\WinRAR\ArcHistory"                                           /f >nul 2>&1
reg delete "HKCU\Software\WinRAR\DialogEditHistory"                                    /f >nul 2>&1
reg delete "HKCU\Software\WinRAR\Interface\History"                                    /f >nul 2>&1
reg delete "HKCU\Software\Winaero.com"                                    				/f >nul 2>&1
reg delete "HKCU\Software\WinZip Computing\WinZip\filemenu"                            /f >nul 2>&1
reg delete "HKCU\Software\Adobe\Acrobat Reader\DC\AVGeneral\cRecentFiles"             /f >nul 2>&1
reg delete "HKCU\Software\Adobe\Adobe Acrobat\DC\AVGeneral\cRecentFiles"              /f >nul 2>&1
reg delete "HKCU\Software\Adobe\Photoshop"                         /v "RecentFiles"   /f >nul 2>&1
reg delete "HKCU\Software\Notepad++\Recent File List"                                  /f >nul 2>&1
reg delete "HKCU\Software\SimonTatham\PuTTY\SshHostKeys"                              /f >nul 2>&1
reg delete "HKCU\Software\SimonTatham\PuTTY\Sessions"                                 /f >nul 2>&1
reg delete "HKCU\Software\Martin Prikryl\WinSCP 2\Sessions"                           /f >nul 2>&1
reg delete "HKCU\Software\Martin Prikryl\WinSCP 2\Configuration\History"              /f >nul 2>&1
reg delete "HKCU\Software\VirtualBox"                              /v "RecentVMList"  /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\VisualStudio\Recent Files"                         /f >nul 2>&1
for %%V in (14.0 15.0 16.0 17.0) do (
    reg delete "HKCU\Software\Microsoft\VisualStudio\%%V\MRUItems"                     /f >nul 2>&1
    reg delete "HKCU\Software\Microsoft\VisualStudio\%%V\FileMRUList"                  /f >nul 2>&1
)
reg delete "HKCU\Software\Microsoft\VSCommon\Connected User Experience" /f >nul 2>&1
echo  OK

:: ============================================================
echo  [09/28] Registro - Telemetria y diagnostico sistema (HKLM)...
:: ============================================================
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Diagnostics\DiagTrack"               /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\InstalledSDB"       /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Appraiser"          /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\OneSettings"                          /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\SQMClient\Windows\DisabledSessions"                         /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WINEVT\Publishers"                    /f >nul 2>&1
echo  OK

:: ============================================================
echo  [10/28] Prefetch...
:: ============================================================
del /f /q "%SystemRoot%\Prefetch\*.pf" 2>nul
echo  OK

:: ============================================================
echo  [11/28] Temporales del usuario y sistema...
:: ============================================================
del /f /s /q "%TEMP%\*.*" 2>nul
for /d %%D in ("%TEMP%\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%LocalAppData%\Temp\*.*" 2>nul
for /d %%D in ("%LocalAppData%\Temp\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%SystemRoot%\Temp\*.*" 2>nul
for /d %%D in ("%SystemRoot%\Temp\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%SystemRoot%\Logs\*.*" 2>nul
for /d %%D in ("%SystemRoot%\Logs\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%SystemRoot%\CBS\Logs\*.*" 2>nul
del /f /s /q "%SystemRoot%\System32\LogFiles\*.*" 2>nul
for /d %%D in ("%SystemRoot%\System32\LogFiles\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%SystemRoot%\Panther\*.*" 2>nul
for /d %%D in ("%SystemRoot%\Panther\*") do rd /s /q "%%D" 2>nul
del /f /q "%SystemRoot%\inf\setupapi.dev.log" 2>nul
del /f /q "%SystemRoot%\inf\setupapi.app.log" 2>nul
del /f /q "%SystemRoot%\inf\setupapi.setup.log" 2>nul
del /f /q "%SystemRoot%\inf\setupapi.offline.log" 2>nul
echo  OK

:: ============================================================
echo  [12/28] Thumbnails, iconcache, shaders y fuentes usuario...
:: ============================================================
del /f /q "%AppData%\Microsoft\Windows\Themes\CachedFiles" 2>nul
del /f /q "%LocalAppData%\Microsoft\Windows\Explorer\thumbcache_*.db" 2>nul
del /f /q "%LocalAppData%\Microsoft\Windows\Explorer\iconcache_*.db" 2>nul
del /f /q "%LocalAppData%\Microsoft\Windows\Caches\*.*" 2>nul
del /f /s /q "%LocalAppData%\D3DSCache\*.*" 2>nul
for /d %%D in ("%LocalAppData%\D3DSCache\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%LocalAppData%\Microsoft\Windows\Fonts\*.*" 2>nul
del /f /s /q "%LocalAppData%\FontCache\*.*" 2>nul
for /d %%D in ("%LocalAppData%\FontCache\*") do rd /s /q "%%D" 2>nul
del /f /q "%SystemRoot%\System32\FNTCACHE.DAT" 2>nul
echo  OK

:: ============================================================
echo  [13/28] Timeline, Cortana, teclado predictivo y Search...
:: ============================================================
for /d %%D in ("%LocalAppData%\ConnectedDevicesPlatform\*") do (
    del /f /q "%%D\*.*" 2>nul
    for /d %%S in ("%%D\*") do rd /s /q "%%S" 2>nul
)
del /f /s /q "%LocalAppData%\Microsoft\InputApp\*.*" 2>nul
for /d %%D in ("%LocalAppData%\Microsoft\InputApp\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%LocalAppData%\Packages\Microsoft.Windows.Search_*\LocalState\*.*" 2>nul
del /f /s /q "%LocalAppData%\Packages\Microsoft.Windows.Cortana_*\LocalState\*.*" 2>nul
del /f /s /q "%LocalAppData%\Packages\Microsoft.549981C3F5F10_*\LocalState\*.*" 2>nul
echo  OK

:: ============================================================
echo  [14/28] Credenciales de red, Protect y RDCMan...
:: ============================================================
del /f /q "%AppData%\Microsoft\Credentials\*.*" 2>nul
del /f /q "%LocalAppData%\Microsoft\Credentials\*.*" 2>nul
del /f /s /q "%AppData%\Microsoft\Protect\*.*" 2>nul
for /d %%D in ("%AppData%\Microsoft\Protect\*") do rd /s /q "%%D" 2>nul
del /f /q "%LocalAppData%\Microsoft\Windows\RDCMan\*.*" 2>nul
del /f /s /q "%LocalAppData%\Microsoft\Remote Desktop Connection Manager\*.*" 2>nul
echo  OK

:: ============================================================
echo  [15/28] Telemetria, WER, ETL y logs de eventos...
:: ============================================================
for /d %%D in ("%ProgramData%\Microsoft\Windows\WER\*") do (
    del /f /s /q "%%D\*.*" 2>nul
    for /d %%S in ("%%D\*") do rd /s /q "%%S" 2>nul
)
del /f /s /q "%ProgramData%\Microsoft\Diagnosis\*.*" 2>nul
for /d %%D in ("%ProgramData%\Microsoft\Diagnosis\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%ProgramData%\Microsoft\Windows\AppRepository\Packages\*.*" 2>nul
del /f /q "%SystemRoot%\*.log" 2>nul
del /f /q "%SystemRoot%\*.txt" 2>nul
del /f /s /q "%ProgramData%\Microsoft\Windows\DeliveryOptimization\Logs\*.*" 2>nul
del /f /s /q "%ProgramData%\Microsoft\Windows\DeliveryOptimization\Cache\*.*" 2>nul
for /d %%D in ("%ProgramData%\Microsoft\Windows\DeliveryOptimization\Cache\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%SystemRoot%\LiveKernelReports\*.*" 2>nul
for /d %%D in ("%SystemRoot%\LiveKernelReports\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%ProgramData%\Microsoft\Windows\RetailDemo\*.*" 2>nul
for /f %%L in ('wevtutil el 2^>nul') do wevtutil cl "%%L" >nul 2>&1
echo  OK

:: ============================================================
echo  [16/28] Portapapeles...
:: ============================================================
:: Win10/11
powershell -command "Set-Clipboard -Value $null" >nul 2>&1
:: Win7/8 fallback
echo. | clip >nul 2>&1
echo  OK

:: ============================================================
echo  [17/28] Notificaciones y Action Center...
:: ============================================================
del /f /q "%LocalAppData%\Microsoft\Windows\Notifications\wpndatabase.db" 2>nul
del /f /q "%LocalAppData%\Microsoft\Windows\Notifications\wpndatabase.db-shm" 2>nul
del /f /q "%LocalAppData%\Microsoft\Windows\Notifications\wpndatabase.db-wal" 2>nul
del /f /q "%LocalAppData%\Microsoft\Windows\ActionCenterCache\*.*" 2>nul
del /f /s /q "%LocalAppData%\Microsoft\Windows\Notifications\*.*" 2>nul
echo  OK

:: ============================================================
echo  [18/28] Windows Update y Delivery Optimization...
:: ============================================================
net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
net stop dosvc >nul 2>&1
del /f /s /q "%SystemRoot%\SoftwareDistribution\Download\*.*" 2>nul
for /d %%D in ("%SystemRoot%\SoftwareDistribution\Download\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%SystemRoot%\SoftwareDistribution\DataStore\Logs\*.*" 2>nul
del /f /q "%SystemRoot%\SoftwareDistribution\ReportingEvents.log" 2>nul
net start wuauserv >nul 2>&1
net start bits >nul 2>&1
net start dosvc >nul 2>&1
echo  OK

:: ============================================================
echo  [19/28] Windows Search - reseteo del indexador...
:: ============================================================
net stop wsearch /y >nul 2>&1
del /f /s /q "%ProgramData%\Microsoft\Search\Data\Applications\Windows\*.*" 2>nul
for /d %%D in ("%ProgramData%\Microsoft\Search\Data\Applications\Windows\*") do rd /s /q "%%D" 2>nul
net start wsearch >nul 2>&1
echo  OK

:: ============================================================
echo  [20/28] Shadow Copies y papelera de reciclaje...
:: ============================================================
vssadmin delete shadows /all /quiet >nul 2>&1

:: Enumerar unidades fisicas con PowerShell (reemplaza wmic)
:: Compatible Win7+ siempre que PowerShell 2.0+ este presente
for /f "usebackq tokens=*" %%D in (
    `powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -ne $null} | Select-Object -ExpandProperty Root" 2^>nul`
) do (
    :: Quitar barra final  (ej: "C:\" -> "C:")
    set "drv=%%D"
    set "drv=!drv:~0,2!"
    if exist "!drv!\$Recycle.Bin\" rd /s /q "!drv!\$Recycle.Bin" 2>nul
    if exist "!drv!\RECYCLER\"     rd /s /q "!drv!\RECYCLER"     2>nul
)
echo  OK

:: ============================================================
echo  [21/28] OneDrive, GPU cache, WebCache, INetCache y ETW...
:: ============================================================
del /f /s /q "%LocalAppData%\Microsoft\OneDrive\logs\*.*" 2>nul
for /d %%D in ("%LocalAppData%\Microsoft\OneDrive\logs\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%LocalAppData%\Microsoft\OneDrive\setup\logs\*.*" 2>nul
del /f /s /q "%LocalAppData%\NVIDIA\*.*" 2>nul
for /d %%D in ("%LocalAppData%\NVIDIA\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%LocalAppData%\NVIDIA Corporation\NV_Cache\*.*" 2>nul
del /f /s /q "%LocalAppData%\AMD\*.*" 2>nul
for /d %%D in ("%LocalAppData%\AMD\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%LocalAppData%\Intel\*.*" 2>nul
for /d %%D in ("%LocalAppData%\Intel\*") do rd /s /q "%%D" 2>nul
taskkill /f /im dllhost.exe >nul 2>&1
del /f /q "%LocalAppData%\Microsoft\Windows\WebCache\WebCacheV01.dat" 2>nul
del /f /q "%LocalAppData%\Microsoft\Windows\WebCache\WebCacheV*.log" 2>nul
del /f /s /q "%LocalAppData%\Microsoft\Windows\INetCache\*.*" 2>nul
for /d %%D in ("%LocalAppData%\Microsoft\Windows\INetCache\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%LocalAppData%\Microsoft\Windows\INetCookies\*.*" 2>nul
del /f /s /q "%AppData%\Microsoft\Windows\Cookies\*.*" 2>nul
del /f /s /q "%LocalAppData%\Microsoft\Feeds Cache\*.*" 2>nul
del /f /s /q "%SystemRoot%\System32\winevt\TraceFormat\*.*" 2>nul
del /f /q "%ProgramData%\Microsoft\Windows\Sqm\*.*" 2>nul
del /f /s /q "%LocalAppData%\CrashDumps\*.*" 2>nul
del /f /s /q "%LocalAppData%\Microsoft\Windows\WER\*.*" 2>nul
for /d %%D in ("%LocalAppData%\Microsoft\Windows\WER\*") do rd /s /q "%%D" 2>nul
echo  OK

:: ============================================================
echo  [22/28] Tareas programadas huerfanas y WSL / Hyper-V logs...
:: ============================================================
schtasks /delete /tn "Microsoft\Windows\Customer Experience Improvement Program\Consolidator"    /f >nul 2>&1
schtasks /delete /tn "Microsoft\Windows\Customer Experience Improvement Program\UsbCeip"         /f >nul 2>&1
schtasks /delete /tn "Microsoft\Windows\Customer Experience Improvement Program\KernelCeipTask"  /f >nul 2>&1
schtasks /delete /tn "Microsoft\Windows\Application Experience\ProgramDataUpdater"               /f >nul 2>&1
schtasks /delete /tn "Microsoft\Windows\Application Experience\StartupAppTask"                   /f >nul 2>&1
schtasks /delete /tn "Microsoft\Windows\PI\Sqm-Tasks"                                            /f >nul 2>&1
schtasks /delete /tn "Microsoft\Windows\Feedback\Siuf\DmClient"                                  /f >nul 2>&1
schtasks /delete /tn "Microsoft\Windows\Feedback\Siuf\DmClientOnScenarioDownload"                /f >nul 2>&1
if exist "%LocalAppData%\Packages\CanonicalGroupLimited.Ubuntu*\LocalState\rootfs\var\log\" (
    del /f /s /q "%LocalAppData%\Packages\CanonicalGroupLimited.Ubuntu*\LocalState\rootfs\var\log\*.*" 2>nul
)
if exist "%ProgramData%\Microsoft\Windows\Hyper-V\Resource Metering\" (
    del /f /s /q "%ProgramData%\Microsoft\Windows\Hyper-V\Resource Metering\*.*" 2>nul
)
del /f /s /q "%SystemRoot%\System32\vmcompute\logs\*.*" 2>nul
echo  OK

:: ============================================================
echo  [23/28] MachineGuid y SQMClient - identidad de maquina...
:: ============================================================
powershell -NoProfile -Command "$g=[guid]::NewGuid().ToString(); Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Cryptography' -Name 'MachineGuid' -Value $g" >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\SQMClient" /v "MachineId" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Diagnostics\DiagTrack\SettingsRequests" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\ClientTelemetry"       /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v "InstallDate"  /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v "InstallTime"  /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v "BuildGUID"    /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v "BuildLab"     /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v "BuildLabEx"   /f >nul 2>&1
echo  OK

:: ============================================================
echo  [24/28] IDs de dispositivos y rastros de hardware PnP...
:: ============================================================
reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\USB"                /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\USBSTOR"            /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\STORAGE"            /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\SWD"                /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\HID"                /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\DISPLAY"            /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Enum\MONITOR"            /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Control\DeviceClasses"   /f >nul 2>&1
reg delete "HKLM\SYSTEM\MountedDevices"                            /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\MountPoints2" /f >nul 2>&1
del /f /s /q "%SystemRoot%\inf\*.log" 2>nul
del /f /s /q "%SystemRoot%\System32\DriverStore\Temp\*.*" 2>nul
for /d %%D in ("%SystemRoot%\System32\DriverStore\Temp\*") do rd /s /q "%%D" 2>nul
echo  OK

:: ============================================================
echo  [25/28] Logs de instalacion del sistema operativo...
:: ============================================================
del /f /s /q "%SystemRoot%\Panther\*.log" 2>nul
del /f /s /q "%SystemRoot%\Panther\*.xml" 2>nul
del /f /s /q "%SystemRoot%\Panther\UnattendGC\*.*" 2>nul
for /d %%D in ("%SystemRoot%\Panther\UnattendGC\*") do rd /s /q "%%D" 2>nul
del /f /q "%SystemRoot%\setuperr.log" 2>nul
del /f /q "%SystemRoot%\setupact.log" 2>nul
del /f /q "%SystemRoot%\setupapi.log" 2>nul
del /f /s /q "%SystemDrive%\$WINDOWS.~BT\*.*" 2>nul
for /d %%D in ("%SystemDrive%\$WINDOWS.~BT\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%SystemDrive%\$WinREAgent\*.*" 2>nul
for /d %%D in ("%SystemDrive%\$WinREAgent\*") do rd /s /q "%%D" 2>nul
if exist "%SystemDrive%\Windows.old\" rd /s /q "%SystemDrive%\Windows.old" 2>nul
del /f /s /q "%SystemRoot%\Logs\CBS\*.*" 2>nul
del /f /s /q "%SystemRoot%\Logs\DPX\*.*" 2>nul
del /f /s /q "%SystemRoot%\Logs\DISM\*.*" 2>nul
echo  OK

:: ============================================================
echo  [26/28] Red - DNS, ARP, Wi-Fi, perfiles y DHCP...
:: ============================================================
ipconfig /flushdns >nul 2>&1
arp -d * >nul 2>&1
echo  OK

:: ============================================================
echo  [27/28] Activacion, logon y perfil publico / Default...
:: ============================================================
del /f /q "%SystemRoot%\System32\spp\store\*.dat" 2>nul
del /f /q "%SystemRoot%\System32\spp\store_test\*.dat" 2>nul
del /f /s /q "%SystemRoot%\System32\spp\store\2.0\*.*" 2>nul
del /f /s /q "%ProgramData%\Microsoft\Windows\ClipSVC\tokens\*.*" 2>nul
del /f /s /q "%ProgramData%\Microsoft\Windows\ClipSVC\install\*.*" 2>nul
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI" /v "LastLoggedOnUser"    /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI" /v "LastLoggedOnSAMUser" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI" /v "LastLoggedOnUserSID" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI" /v "SelectedUserSID"     /f >nul 2>&1
del /f /s /q "%Public%\Documents\*.*" 2>nul
del /f /s /q "%Public%\Downloads\*.*" 2>nul
del /f /s /q "%Public%\Music\*.*" 2>nul
del /f /s /q "%Public%\Pictures\*.*" 2>nul
del /f /s /q "%Public%\Videos\*.*" 2>nul
del /f /q "%SystemDrive%\Users\Default\AppData\Local\Microsoft\Windows\Explorer\thumbcache_*.db" 2>nul
del /f /q "%SystemDrive%\Users\Default\AppData\Roaming\Microsoft\Windows\Recent\*.*" 2>nul
echo  OK

:: ============================================================
echo  [28/28] Dumps, hibernacion, pagefile y Superfetch...
:: ============================================================
del /f /q "%SystemRoot%\MEMORY.DMP" 2>nul
del /f /q "%SystemRoot%\minidump\*.dmp" 2>nul
del /f /s /q "%ProgramData%\Microsoft\Windows\WER\ReportQueue\*.*" 2>nul
for /d %%D in ("%ProgramData%\Microsoft\Windows\WER\ReportQueue\*") do rd /s /q "%%D" 2>nul
del /f /s /q "%ProgramData%\Microsoft\Windows\WER\ReportArchive\*.*" 2>nul
for /d %%D in ("%ProgramData%\Microsoft\Windows\WER\ReportArchive\*") do rd /s /q "%%D" 2>nul
powercfg -h off >nul 2>&1
del /f /q "%SystemDrive%\hiberfil.sys" 2>nul
net stop sysmain >nul 2>&1
del /f /s /q "%SystemRoot%\Prefetch\*.*" 2>nul
net start sysmain >nul 2>&1
del /f /s /q "%LocalAppData%\Microsoft\Windows\UsrClass.dat.LOG*" 2>nul
echo  OK

:: ============================================================
echo.
echo  Reiniciando el Explorador de Windows...
:: ============================================================
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start explorer.exe

echo.
echo  =====================================================================
echo   LIMPIEZA COMPLETADA  -  v7
echo   Se recomienda reiniciar antes de capturar la ISO.
echo  =====================================================================
echo.
pause
endlocal
exit /b
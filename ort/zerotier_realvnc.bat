@echo off
setlocal enabledelayedexpansion

:: =================================================================
::                         KONFIGURACE
:: =================================================================

:: Síť 1 - Produkční
set "NET1_ID=16_mistne_ID_site_1"
set "NET1_VNC=C:\Cesta\K\Souboru\produkce.vnc"

:: Síť 2 - Záložní
set "NET2_ID=16_mistne_ID_site_2"
set "NET2_VNC=C:\Cesta\K\Souboru\zaloha.vnc"

:: Cesta k VNC Vieweru
set "VNC_PATH=C:\Program Files\RealVNC\VNC Viewer\vncviewer.exe"

:: =================================================================

:: 1. Kontrola administrátorských práv (ZeroTier je vyžaduje)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [CHYBA] Skript musite spustit jako SPRAVCE.
    echo Kliknete na soubor pravym tlacitkem a zvolte "Spustit jako spravce".
    pause
    exit /b
)

:MENU
cls
echo ======================================================
echo    ZeroTier + VNC Auto-Přepínač
echo ======================================================
echo 1) Pripojit k: PRODUKCNI SIT  (%NET1_ID%)
echo 2) Pripojit k: ZALOZNI SIT    (%NET2_ID%)
echo Q) Ukoncit
echo ------------------------------------------------------
set /p choice="Vase volba (1, 2 nebo Q): "

if /I "%choice%"=="Q" exit /b

if "%choice%"=="1" (
    set "TARGET_ID=%NET1_ID%"
    set "TARGET_VNC=%NET1_VNC%"
    set "OLD_ID=%NET2_ID%"
) else if "%choice%"=="2" (
    set "TARGET_ID=%NET2_ID%"
    set "TARGET_VNC=%NET2_VNC%"
    set "OLD_ID=%NET1_ID%"
) else (
    echo.
    echo Neplatna volba, zkuste to znovu.
    timeout /t 2 >nul
    goto MENU
)

:: 2. Odpojení od vedlejší sítě
echo.
echo [1/3] Opoustim vedlejsi sit %OLD_ID%...
zerotier-cli leave %OLD_ID% >nul 2>&1

:: 3. Připojení k nové síti
echo [2/3] Pripojuji k siti %TARGET_ID%...
zerotier-cli join %TARGET_ID% | findstr "200 join OK" >nul
if errorlevel 1 (
    echo [CHYBA] Nepodarilo se komunikovat se ZeroTier sluzbou.
    pause
    exit /b
)

:: 4. Čekání na stav OK (autorizace sítě)
echo [3/3] Cekam na autorizaci a navazani spojeni (stav OK)...
<nul set /p=.
:CHECK_STATUS
zerotier-cli listnetworks | findstr /C:"%TARGET_ID%" | findstr "OK" >nul
if errorlevel 1 (
    <nul set /p=.
    timeout /t 2 /nobreak >nul
    goto CHECK_STATUS
)

:: 5. Kontrola existence VNC souboru a spuštění
echo.
echo [HOTOVO] Sit je pripravena.
echo Spoustim profil: %TARGET_VNC%

if not exist "%TARGET_VNC%" (
    echo [VAROVANI] Soubor .vnc nebyl nalezen v: %TARGET_VNC%
    echo Zkuste zadat IP adresu rucne ve VNC Vieweru.
    start "" "%VNC_PATH%"
) else (
    start "" "%VNC_PATH%" -config "%TARGET_VNC%"
)

timeout /t 3 >nul
exit /b
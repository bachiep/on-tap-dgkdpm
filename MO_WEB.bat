@echo off
cd /d "%~dp0"
title On Tap Danh Gia va Kiem Dinh Chat Luong Phan Mem - Phenikaa

echo ===================================================================
echo    HE THONG ON TAP DANH GIA VA KIEM DINH CHAT LUONG PHAN MEM
echo ===================================================================
echo.
echo [1/2] Dang mo trinh duyet tai: http://localhost:8000 ...
start "" "http://localhost:8000"

echo [2/2] Dang khoi dong may chu du lieu va API dong bo...
echo ===================================================================
echo   [OK] HE THONG DA SAN SANG 100%%!
echo   - Dia chi: http://localhost:8000
echo   - Bo de: 299 trac nghiem (6 Group) + 15 so do CFG/DFG + 10 De mau
echo   - Cong thuc: V(G) McCabe, Bien BVA, Do phu C0/C1/C2, Flashcard 3D
echo.
echo   * Thu nho cua so nay xuong taskbar de tiep tuc hoc.
echo   * Khi hoc xong, dong cua so nay de tat may chu.
echo ===================================================================
echo.

where python >nul 2>nul
if %errorlevel% equ 0 (
    python server.py 8000
    goto :end
)

where npx >nul 2>nul
if %errorlevel% equ 0 (
    npx serve -p 8000 .
    goto :end
)

start "" "%~dp0index.html"

:end

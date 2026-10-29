@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   CNIP Network Manager - Windows Service Host Runner
echo ========================================================

REM Set production parameters
set SPRING_PROFILES_ACTIVE=dev
set SERVER_PORT=8080

REM Find java executable
where java >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Java 21 runtime not found in system PATH.
    pause
    exit /b 1
)

echo [*] Starting CNIP Network Manager JAR on http://localhost:8080 ...
java -XX:+UseG1GC -Xmx1024m -jar "%~dp0backend\target\cnip-network-manager-1.0.0.jar"

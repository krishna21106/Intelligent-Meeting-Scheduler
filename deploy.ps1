# ==============================================================================
# CNIP Network Manager - Windows Server Deployment Script
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      CNIP Network Manager - Windows Server Setup       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Ensure .env exists
if (-not (Test-Path ".env")) {
    Write-Host "[*] Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# Check if Docker is running
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    Write-Host "[+] Docker detected. Launching production containers..." -ForegroundColor Green
    docker compose down --remove-orphans
    docker compose up -d --build
    
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "             DEPLOYMENT SUCCESSFUL!                     " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  Web Dashboard:     http://localhost"
    Write-Host "  REST API:          http://localhost:8080/api"
    Write-Host "  Swagger UI Docs:   http://localhost:8080/swagger-ui.html"
    Write-Host ""
    Write-Host "  Default Logins:"
    Write-Host "    • Admin:    admin / Admin123!"
    Write-Host "    • Operator: operator / Operator123!"
    Write-Host "    • Viewer:   viewer / Viewer123!"
} else {
    Write-Host "[-] Docker not found. Starting in Direct Host Mode..." -ForegroundColor Yellow
    Write-Host "[*] Starting Backend (Spring Boot)..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; mvn spring-boot:run"
    
    Write-Host "[*] Starting Frontend (Vite)..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- --host 0.0.0.0 --port 5173"
    
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  Direct Host Mode Running:" -ForegroundColor Green
    Write-Host "  Web Console: http://localhost:5173"
    Write-Host "  Backend API: http://localhost:8080/api"
    Write-Host "========================================================" -ForegroundColor Green
}

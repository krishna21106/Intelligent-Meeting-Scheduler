# ==============================================================================
# CNIP Network Manager - Windows Service Installer & Manager
# ==============================================================================

param (
    [Parameter(Position=0)]
    [ValidateSet("install", "start", "stop", "restart", "status", "uninstall")]
    [string]$Action = "install"
)

$TaskName = "CNIP_Network_Manager"
$JarPath = "$PSScriptRoot\backend\target\cnip-network-manager-1.0.0.jar"
$JavaCmd = (Get-Command java -ErrorAction SilentlyContinue).Source

if (-not $JavaCmd) {
    Write-Error "Java runtime (java.exe) was not found in system PATH. Please ensure Java 21 is installed."
    exit 1
}

if (-not (Test-Path $JarPath)) {
    Write-Error "Production JAR not found at $JarPath. Please build it first with 'mvn package'."
    exit 1
}

function Install-Service {
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "  Installing CNIP Network Manager Windows Service...    " -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan

    $VbsRunner = "$PSScriptRoot\run-service-background.vbs"
    $VbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "$PSScriptRoot"
WshShell.Run "java -XX:+UseG1GC -Xmx1024m -jar `"$JarPath`"", 0, False
"@
    Set-Content -Path $VbsRunner -Value $VbsContent -Encoding ASCII

    # Register Scheduled Task to run at system startup
    $ActionObj = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsRunner`"" -WorkingDirectory $PSScriptRoot
    $TriggerObj = New-ScheduledTaskTrigger -AtStartup
    $PrincipalObj = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
    $SettingsObj = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 365)

    try {
        # Unregister existing task if present
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        Register-ScheduledTask -TaskName $TaskName -Action $ActionObj -Trigger $TriggerObj -Principal $PrincipalObj -Settings $SettingsObj | Out-Null
        Write-Host "[+] Registered Windows Scheduled Task: $TaskName (Triggers At Startup)" -ForegroundColor Green
    } catch {
        Write-Warning "Could not register system task: $_. Falling back to background process."
    }

    Start-ServiceProcess
}

function Start-ServiceProcess {
    Write-Host "[*] Launching CNIP Network Manager in background..." -ForegroundColor Yellow
    
    # Check if port 8080 is already active
    $portActive = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
    if ($portActive) {
        Write-Host "[!] Port 8080 is already in use by PID $($portActive[0].OwningProcess)." -ForegroundColor Yellow
        Write-Host "[+] Service is already active!" -ForegroundColor Green
    } else {
        $Process = Start-Process -FilePath $JavaCmd -ArgumentList "-XX:+UseG1GC", "-Xmx1024m", "-jar", "`"$JarPath`"" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
        Start-Sleep -Seconds 8
        Write-Host "[+] Started Background Process (PID: $($Process.Id))." -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "        WINDOWS SERVICE DEPLOYED SUCCESSFULLY!          " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  Web Dashboard:     http://localhost:8080"
    Write-Host "  REST API:          http://localhost:8080/api"
    Write-Host "  Swagger UI Docs:   http://localhost:8080/swagger-ui.html"
    Write-Host "  Health Probe:      http://localhost:8080/actuator/health"
    Write-Host ""
    Write-Host "  Pre-Configured Role Credentials:"
    Write-Host "    • Admin:    admin / Admin123!"
    Write-Host "    • Operator: operator / Operator123!"
    Write-Host "    • Viewer:   viewer / Viewer123!"
    Write-Host "    • Customer: customer / Customer123!"
    Write-Host "========================================================" -ForegroundColor Green
}

function Stop-ServiceProcess {
    Write-Host "[*] Stopping CNIP Network Manager Windows Service..." -ForegroundColor Yellow
    $javaProcs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*cnip-network-manager-1.0.0.jar*" }
    if ($javaProcs) {
        foreach ($p in $javaProcs) {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
            Write-Host "[+] Terminated Process PID $($p.ProcessId)." -ForegroundColor Green
        }
    } else {
        Write-Host "[-] No active CNIP Network Manager processes found." -ForegroundColor Gray
    }
}

function Get-ServiceStatus {
    $javaProcs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*cnip-network-manager-1.0.0.jar*" }
    $portActive = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
    
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "        CNIP Network Manager Service Status             " -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
    if ($javaProcs -and $portActive) {
        Write-Host "Status:        RUNNING (HEALTHY)" -ForegroundColor Green
        Write-Host "Process PID:   $($javaProcs[0].ProcessId)"
        Write-Host "Listening:     http://localhost:8080"
    } else {
        Write-Host "Status:        STOPPED" -ForegroundColor Red
    }
}

function Uninstall-Service {
    Stop-ServiceProcess
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Remove-Item "$PSScriptRoot\run-service-background.vbs" -Force -ErrorAction SilentlyContinue
    Write-Host "[+] Uninstalled Windows Scheduled Task and stopped background processes." -ForegroundColor Green
}

switch ($Action.ToLower()) {
    "install"   { Install-Service }
    "start"     { Start-ServiceProcess }
    "stop"      { Stop-ServiceProcess }
    "restart"   { Stop-ServiceProcess; Start-Sleep -Seconds 2; Start-ServiceProcess }
    "status"    { Get-ServiceStatus }
    "uninstall" { Uninstall-Service }
}

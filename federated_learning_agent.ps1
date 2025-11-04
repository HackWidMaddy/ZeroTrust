# Federated Learning Agent Script
# This script participates in federated learning rounds
# Run on each compromised machine (bot)

param(
    [string]$CoordinatorUrl = "http://localhost:5000",
    [string]$ClientId = "bot-001",
    [int]$MaxRounds = 10,
    [int]$SleepSeconds = 5,
    [int]$Steps = 50,
    [int]$VectorSize = 100,
    [double]$Lr = 0.05
)

$ErrorActionPreference = "Continue"

Write-Host "=== Federated Learning Agent ===" -ForegroundColor Cyan
Write-Host "Client ID: $ClientId" -ForegroundColor Gray
Write-Host "Coordinator: $CoordinatorUrl" -ForegroundColor Gray
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

while ($true) {
    try {
        # Get current round status
        Write-Host "[*] Checking for active rounds..." -ForegroundColor Yellow
        $statusResponse = Invoke-RestMethod -Uri "$CoordinatorUrl/fl/status" -Method GET -ErrorAction Stop
        $statusResponse | ConvertTo-Json | Write-Host
        
        if (-not $statusResponse.active) {
            Write-Host "[*] No active round. Waiting..." -ForegroundColor Gray
            Start-Sleep -Seconds $SleepSeconds
            continue
        }
        
        # Get current global weights from coordinator
        Write-Host "[*] Fetching global weights..." -ForegroundColor Yellow
        $configResponse = Invoke-RestMethod -Uri "$CoordinatorUrl/fl/config" -Method GET -ErrorAction Stop
        
        $globalWeights = $configResponse.global_weights
        $vectorSize = $configResponse.config.vector_size
        Write-Host "[+] Received global weights (vector_size: $vectorSize)" -ForegroundColor Green
        
        # Perform local training by invoking Python training step
        Write-Host "[*] Training on local data (python backend/train_step.py)..." -ForegroundColor Yellow

        $inPath = Join-Path $env:TEMP "fl_weights_in.json"
        $outPath = Join-Path $env:TEMP "fl_weights_out.json"
        ($globalWeights | ConvertTo-Json -Depth 10) | Set-Content -Path $inPath -Encoding UTF8

        $pyArgs = @(
            "backend/train_step.py",
            "--in", $inPath,
            "--out", $outPath,
            "--vector_size", $vectorSize,
            "--steps", $Steps,
            "--lr", $Lr
        )

        $python = "python"
        & $python @pyArgs
        if (!(Test-Path $outPath)) {
            throw "Training step failed: output not created"
        }

        $localWeights = Get-Content -Raw -Path $outPath | ConvertFrom-Json
        
        # Simulated local dataset size
        $numSamples = 200
        
        Write-Host "[+] Training complete (local samples: $numSamples)" -ForegroundColor Green
        
        # Submit local update to coordinator
        Write-Host "[*] Submitting local update..." -ForegroundColor Yellow
        $updateBody = @{
            client_id = $ClientId
            weights = $localWeights
            num_samples = $numSamples
        } | ConvertTo-Json -Depth 10
        
        $updateResponse = Invoke-RestMethod -Uri "$CoordinatorUrl/fl/submit-update" -Method POST -Headers @{"Content-Type"="application/json"} -Body $updateBody -ErrorAction Stop
        
        Write-Host "[+] Update submitted successfully!" -ForegroundColor Green
        Write-Host "    Round ID: $($updateResponse.round_id)" -ForegroundColor Gray
        Write-Host "    Pending updates: $($updateResponse.pending_updates)" -ForegroundColor Gray
        Write-Host ""
        
        # Wait before next iteration
        Start-Sleep -Seconds $SleepSeconds
        
    } catch {
        Write-Host "[!] Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "[*] Retrying in $SleepSeconds seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds $SleepSeconds
    }
}


# PowerShell script to validate the Solana/Helius RPC Gateway

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "RUNNING SOLANA RPC GATEWAY VALIDATIONS" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Test 1: GET Root reference page
Write-Host "`n[Test 1] Hitting gateway root GET / on sol.flashrouter.io ..." -ForegroundColor Cyan
try {
    $res1 = curl.exe -s -i https://sol.flashrouter.io/
    if ($res1 -match "FlashRouter Sovereign Solana RPC Gateway" -and $res1 -match "HTTP/1.1 200 OK") {
        Write-Host "SUCCESS: Root GET page returned 200 OK with correct Solana title!" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Root GET page response invalid" -ForegroundColor Red
        Write-Host $res1
        Exit 1
    }
} catch {
    Write-Host "ERROR running Test 1: $_" -ForegroundColor Red
    Exit 1
}

# Test 2: POST Valid JSON-RPC request to Helius Mainnet-Beta proxy
Write-Host "`n[Test 2] Hitting gateway POST proxy (getSlot) ..." -ForegroundColor Cyan
try {
    $tempFile2 = Join-Path $env:TEMP "temp_sol_body2.json"
    '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' | Out-File -FilePath $tempFile2 -Encoding utf8
    
    $res2 = curl.exe -s -i -X POST https://sol.flashrouter.io/ -H "Content-Type: application/json" -d "@$tempFile2"
    Remove-Item $tempFile2 -ErrorAction SilentlyContinue
    
    if ($res2 -match "HTTP/1.1 200 OK" -and ($res2 -match "result" -or $res2 -match "error")) {
        Write-Host "SUCCESS: Helius RPC getSlot request forwarded successfully!" -ForegroundColor Green
        # Print a snippet of the result
        $resLine = ($res2 | Select-String "result")
        Write-Host "RPC Response: $resLine" -ForegroundColor Gray
    } else {
        Write-Host "FAILURE: Helius RPC getSlot query failed" -ForegroundColor Red
        Write-Host $res2
        Exit 1
    }
} catch {
    Remove-Item $tempFile2 -ErrorAction SilentlyContinue -Force
    Write-Host "ERROR running Test 2: $_" -ForegroundColor Red
    Exit 1
}

# Test 3: POST Sanctioned JSON-RPC request to Solana Gateway
Write-Host "`n[Test 3] Hitting gateway with Solana sanctioned address (7vD9a65d06dcc435a52D5880C6310Bd6E96c156DB) ..." -ForegroundColor Cyan
try {
    $tempFile3 = Join-Path $env:TEMP "temp_sol_body3.json"
    '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["7vD9a65d06dcc435a52D5880C6310Bd6E96c156DB"]}' | Out-File -FilePath $tempFile3 -Encoding utf8
    
    $res3 = curl.exe -s -i -X POST https://sol.flashrouter.io/ -H "Content-Type: application/json" -d "@$tempFile3"
    Remove-Item $tempFile3 -ErrorAction SilentlyContinue
    
    if ($res3 -match "HTTP/1.1 403 Forbidden" -and $res3 -match "Sanction compliance check failed") {
        Write-Host "SUCCESS: Sanctioned Solana address blocked with 403 Forbidden compliance error!" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Sanctioned address was NOT blocked correctly!" -ForegroundColor Red
        Write-Host $res3
        Exit 1
    }
} catch {
    Remove-Item $tempFile3 -ErrorAction SilentlyContinue -Force
    Write-Host "ERROR running Test 3: $_" -ForegroundColor Red
    Exit 1
}

Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "ALL SOLANA GATEWAY VALIDATIONS PASSED" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

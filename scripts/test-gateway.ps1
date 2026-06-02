# PowerShell script to validate the FlashRouter Secure Web3 Gateway

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "RUNNING SOVEREIGN RPC GATEWAY VALIDATIONS" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Test 1: GET Root reference page
Write-Host "`n[Test 1] Hitting gateway root GET / ..." -ForegroundColor Cyan
try {
    $res1 = curl.exe -s -i https://eth.flashrouter.io/
    if ($res1 -match "FlashRouter Sovereign RPC Gateway" -and $res1 -match "HTTP/1.1 200 OK") {
        Write-Host "SUCCESS: Root GET page returned 200 OK with correct title!" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Root GET page response invalid" -ForegroundColor Red
        Write-Host $res1
        Exit 1
    }
} catch {
    Write-Host "ERROR running Test 1: $_" -ForegroundColor Red
    Exit 1
}

# Test 2: POST Valid JSON-RPC request to v1/ethereum
Write-Host "`n[Test 2] Hitting gateway namespaced POST v1/ethereum (eth_blockNumber) ..." -ForegroundColor Cyan
try {
    $tempFile2 = Join-Path $env:TEMP "temp_body2.json"
    '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | Out-File -FilePath $tempFile2 -Encoding utf8
    
    $res2 = curl.exe -s -i -X POST https://eth.flashrouter.io/v1/ethereum -H "Content-Type: application/json" -d "@$tempFile2"
    Remove-Item $tempFile2 -ErrorAction SilentlyContinue
    
    if ($res2 -match "HTTP/1.1 200 OK" -and ($res2 -match "result" -or $res2 -match "error")) {
        Write-Host "SUCCESS: Valid blockNumber request forwarded successfully!" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Valid blockNumber query failed" -ForegroundColor Red
        Write-Host $res2
        Exit 1
    }
} catch {
    Remove-Item $tempFile2 -ErrorAction SilentlyContinue -Force
    Write-Host "ERROR running Test 2: $_" -ForegroundColor Red
    Exit 1
}

# Test 3: POST Sanctioned JSON-RPC request to v1/ethereum
Write-Host "`n[Test 3] Hitting gateway namespaced POST v1/ethereum with Tornado Cash address (0xd90e2f925e14912d40c4b4a8a3a3d8667b9de1f0) ..." -ForegroundColor Cyan
try {
    $tempFile3 = Join-Path $env:TEMP "temp_body3.json"
    '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0xd90e2f925e14912d40c4b4a8a3a3d8667b9de1f0","data":"0x"}],"id":1}' | Out-File -FilePath $tempFile3 -Encoding utf8
    
    $res3 = curl.exe -s -i -X POST https://eth.flashrouter.io/v1/ethereum -H "Content-Type: application/json" -d "@$tempFile3"
    Remove-Item $tempFile3 -ErrorAction SilentlyContinue
    
    if ($res3 -match "HTTP/1.1 403 Forbidden" -and $res3 -match "Sanction compliance check failed") {
        Write-Host "SUCCESS: Sanctioned address blocked with 403 Forbidden compliance error!" -ForegroundColor Green
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
Write-Host "ALL GATEWAY VALIDATIONS PASSED SUCCESSFULLY" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

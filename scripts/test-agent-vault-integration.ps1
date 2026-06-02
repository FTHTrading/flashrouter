# PowerShell script to validate the Legacy Vault database integration with BankOfAIAgent

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "RUNNING AGENT VAULT INTEGRATION VALIDATION" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Set up test environment
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5433/legacy_vault"
$env:FLASH_ROUTER_API_KEY = "fr_test_key_123"

# Test 1: Run agent in EVM mode
Write-Host "`n[Test 1] Executing agent opportunity loop (EVM/Base mode) ..." -ForegroundColor Cyan
try {
    # Run the TS agent directly via tsx CLI
    npx.cmd tsx sdk/src/agent/agent.ts
} catch {
    Write-Host "ERROR running agent opportunity: $_" -ForegroundColor Red
    Exit 1
}

# Test 2: Run verification script
Write-Host "`n[Test 2] Verifying database records via Node pg client ..." -ForegroundColor Cyan
try {
    node scripts/verify-db-records.js
} catch {
    Write-Host "ERROR running database verification: $_" -ForegroundColor Red
    Exit 1
}

Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "AGENT VAULT INTEGRATION VALIDATIONS PASSED" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

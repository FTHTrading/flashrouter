# close-power-client.ps1
# REAL minimum viable closer for power client FlashWallets on Base (Aave V3).
# Run from flashrouter root.
#
# Usage examples:
#   .\scripts\close-power-client.ps1 -ClientName "SravanVallenki" -WalletType "FlashWallet_BasicArb"
#   .\scripts\close-power-client.ps1 -ClientName "FutureTechHoldings" -WalletType "FlashWallet" -Deploy
#
# This actually:
# - Runs sovereign preflight
# - Creates per-client source from exact template or BasicArb
# - Copies to flash-bot for compile/deploy
# - Compiles
# - (optional) deploys (guarded)
# - Writes handoff.md + updates clients/registry.json
#
# Security: Never logs keys. Owner set to deployer (tell client to transfer ownership immediately after).
# For real named client mainnet close: human approval required (sovereign).

param(
    [Parameter(Mandatory=$true)]
    [string]$ClientName,

    [string]$WalletType = "FlashWallet_BasicArb",   # FlashWallet (exact skeleton) or FlashWallet_BasicArb (with strategy)
    [switch]$Deploy,                                 # Actually run the hardhat deploy (requires .env PRIVATE_KEY in flash-bot)
    [string]$OwnerAddress = "",                      # Optional: if set, we can note it for post-deploy transfer
    [string]$Notes = "",
    [string]$Network = "base",                       # base (mainnet) or baseSepolia (safe test)
    [string]$StrategySnippet = ""                    # Optional code to inject into executeOperation (the "alpha")
)

$ErrorActionPreference = "Stop"
$ClientSlug = ($ClientName -replace '[^a-zA-Z0-9]', '')
$Root = Split-Path -Parent $PSScriptRoot
$FlashBot = Join-Path $Root "..\flash-bot"
$ClientsDir = Join-Path $FlashBot "clients\$ClientSlug"
$Registry = Join-Path $FlashBot "clients\registry.json"

Write-Host "=== POWER CLIENT CLOSE: $ClientName ===" -ForegroundColor Cyan
Write-Host "Wallet base: $WalletType" -ForegroundColor Gray

# 1. Sovereign preflight (required)
Write-Host "`n[1/6] Running sovereign preflight for flashrouter..." -ForegroundColor Yellow
$preflight = & "C:\Users\Kevan\sovereign-control-plane\scripts\preflight.ps1" -Scope flashrouter 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Preflight failed. Aborting close."
}
Write-Host "Preflight passed." -ForegroundColor Green

# 2. Create client working dir + customized source
Write-Host "`n[2/6] Creating client package at $ClientsDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $ClientsDir -Force | Out-Null

$baseSol = Join-Path $Root "contracts\src\power-clients\$WalletType.sol"
if (-not (Test-Path $baseSol)) {
    $baseSol = Join-Path $Root "contracts\src\power-clients\FlashWallet.sol"  # fallback to exact
}

$destSol = Join-Path $ClientsDir "FlashWallet_$ClientSlug.sol"
Copy-Item $baseSol $destSol -Force

# Rename contract inside the file for cleanliness
(Get-Content $destSol) -replace 'contract FlashWallet[^ ]*', "contract FlashWallet_$ClientSlug" |
    Set-Content $destSol

# Add client header
$header = @"
// SPDX-License-Identifier: MIT
// Power Client: $ClientName ($ClientSlug)
// Base: Aave V3
// Closed: $(Get-Date -Format "yyyy-MM-dd HH:mm")
// Notes: $Notes
// Owner after deploy: transfer to client multisig immediately.
// Strategy lives in executeOperation.

"@
$body = Get-Content $destSol -Raw
$body = $header + ($body -replace '(?s)^// SPDX.*?(?=pragma solidity)', '')
Set-Content $destSol $body

Write-Host "   Customized source written: $destSol" -ForegroundColor Green

# 3. Sync to flash-bot contracts for hardhat
$fbClients = Join-Path $FlashBot "contracts\power-clients\FlashWallet_$ClientSlug.sol"
Copy-Item $destSol $fbClients -Force
Write-Host "   Synced to flash-bot for compile/deploy." -ForegroundColor Gray

# 3.5 Inject strategy snippet if provided (the alpha) - robust append inside function
if ($StrategySnippet) {
    Write-Host "   Injecting custom strategy snippet into executeOperation..." -ForegroundColor Yellow
    $content = Get-Content $destSol -Raw
    $inject = @"

        // === CUSTOM STRATEGY INJECTED BY CLOSER ===
        $StrategySnippet
        // === END CUSTOM ===
"@
    # Insert after the totalOwed line, before any existing strategy or repayment
    $content = $content -replace '(uint256 totalOwed = amount \+ premium;\s*)', "`$1`n$inject`n"
    Set-Content $destSol $content
    Copy-Item $destSol $fbClients -Force
}

# 4. Compile
Write-Host "`n[3/6] Compiling in flash-bot..." -ForegroundColor Yellow
Push-Location $FlashBot
try {
    $compileOut = npm run compile 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Compile failed: $compileOut" }
    Write-Host "   Compile OK" -ForegroundColor Green
} finally {
    Pop-Location
}

# 5. Deploy (guarded)
$deployedAddress = $null
if ($Deploy) {
    Write-Host "`n[4/6] DEPLOYING on $Network ..." -ForegroundColor Red
    Write-Warning "This will broadcast a real transaction if PRIVATE_KEY is set."
    Write-Host "   Make sure this is authorized (sovereign human approval for real client wallets)." -ForegroundColor Yellow

    Push-Location $FlashBot
    try {
        $deployCmd = "npx hardhat run scripts/deploy-power-client.cjs --network $Network"
        # Pass contract name and optional owner
        $deployOut = & cmd /c "$deployCmd FlashWallet_$ClientSlug $Network $OwnerAddress" 2>&1
        Write-Host $deployOut
        if ($deployOut -match 'deployed to:\s*(0x[0-9a-fA-F]{40})') {
            $deployedAddress = $matches[1]
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[4/6] Deploy skipped (use -Deploy to actually broadcast)." -ForegroundColor Gray
    Write-Host "   To deploy manually (test safe on baseSepolia):" -ForegroundColor DarkGray
    Write-Host "     cd $FlashBot" -ForegroundColor DarkGray
    Write-Host "     npx hardhat run scripts/deploy-power-client.cjs --network baseSepolia FlashWallet_$ClientSlug baseSepolia" -ForegroundColor DarkGray
}

# 6. Handoff + registry
Write-Host "`n[5/6] Writing handoff and registry..." -ForegroundColor Yellow

$handoff = @"
# Power Client Handoff — $ClientName

**Date:** $(Get-Date -Format "yyyy-MM-dd")
**Base Aave V3 FlashWallet**

## Contract
- Customized from: $WalletType
- Source (for client review): $destSol
- Deployed address: $($deployedAddress ?? "(run with -Deploy or manually)")
- Owner at deploy time: the PRIVATE_KEY wallet (immediately transfer ownership to client multisig after receipt)

## How the client uses it
1. Call requestFlashLoan(asset, amount) from the owner address.
2. The strategy in executeOperation runs atomically with the flash.
3. Profits stay in the contract — client calls withdraw() to pull.

## Billing
Minimum: `$25,000 upfront OR 20% of realized profit on each successful flash (whichever is agreed).

## Next steps for client
- Verify the contract on Basescan.
- Test with tiny amounts on mainnet or use Sepolia fork first.
- For private alpha: see Railgun integration path in flash-system/RAILGUN_INTEGRATION.md (deposit to shielded, private strategy steps, unshield for repay).
- XRP treasury/PoF evidence available if needed for funding: 8E26321733467C94A1A4291381AA06EA737ACA0EDBF66F6738606B7779DE4F38 (20 XRP at `$1.2617).

## Evidence / Audit
- Full system story, exact FlashWallet.sol, Railgun flow, and XRP PoF at flashrouter.io (sections #flash-system, #zk-privacy, #xrp-evidence).
- Sovereign preflight passed before close.
- MCP tool close_power_client can orchestrate this.

Contact for support / next wallet: via troptions channels.

**This wallet is isolated and non-custodial. Client controls the private key / multisig.**
"@

$handoffPath = Join-Path $ClientsDir "HANDOFF.md"
Set-Content $handoffPath $handoff

# Update simple registry (dedup by slug)
if (-not (Test-Path $Registry)) {
    "[]" | Set-Content $Registry
}
$reg = @(Get-Content $Registry -Raw | ConvertFrom-Json)
$entry = [pscustomobject]@{
    client = $ClientName
    slug = $ClientSlug
    walletType = $WalletType
    source = $destSol
    handoff = $handoffPath
    deployed = $deployedAddress
    date = (Get-Date).ToString("o")
    notes = $Notes
    network = $Network
}
$reg = $reg | Where-Object { $_.slug -ne $ClientSlug }
$reg = @($reg) + $entry
$reg | ConvertTo-Json -Depth 5 | Set-Content $Registry

Write-Host "   Handoff: $handoffPath" -ForegroundColor Green
Write-Host "   Registry updated: $Registry" -ForegroundColor Green

# 6. Final
Write-Host "`n[6/6] CLOSE COMPLETE for $ClientName" -ForegroundColor Cyan
if ($deployedAddress) {
    Write-Host "Deployed: $deployedAddress on $Network" -ForegroundColor Green
} else {
    Write-Host "Run again with -Deploy (after approval) or run the hardhat command above to get the address." -ForegroundColor Yellow
}
if ($StrategySnippet) {
    Write-Host "Strategy snippet injected into client contract." -ForegroundColor Green
}

Write-Host "`nSovereign note: Real client mainnet wallets require explicit human approval per registry/systems.yaml." -ForegroundColor Magenta
Write-Host "For Sravan / FTH or other named clients — confirm approval before -Deploy on mainnet. Use -Network baseSepolia for safe tests." -ForegroundColor Magenta

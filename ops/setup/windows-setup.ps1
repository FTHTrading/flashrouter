# FlashRouter Ops — Windows 11 setup
# ----------------------------------------------------------------------------
# Installs the xAI CLI, configures env vars, installs Python deps for voice,
# wires up MCP config, and runs a smoke test.
#
# Usage:
#   cd C:\path\to\flashrouter\ops\setup
#   .\windows-setup.ps1
# ----------------------------------------------------------------------------

#Requires -Version 5

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  FlashRouter Ops — Windows Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------------------------------------
# 1. Install xAI CLI
# ----------------------------------------------------------------------------

Write-Host "[1/6] Installing xAI CLI..." -ForegroundColor Yellow
try {
    Invoke-RestMethod https://x.ai/cli/install.ps1 | Invoke-Expression
    Write-Host "   xAI CLI installed." -ForegroundColor Green
} catch {
    Write-Host "   xAI CLI install failed: $_" -ForegroundColor Red
    Write-Host "   You can retry manually: irm https://x.ai/cli/install.ps1 | iex"
}

# ----------------------------------------------------------------------------
# 2. Capture API key into User env vars (NOT committed, NOT echoed)
# ----------------------------------------------------------------------------

Write-Host ""
Write-Host "[2/6] Setting environment variables..." -ForegroundColor Yellow
Write-Host "   We'll prompt for each key. Press ENTER to skip any you've already set."
Write-Host "   Existing values are preserved — they're only overwritten if you type a new one."
Write-Host ""

function Set-UserEnvSecure {
    param([string]$Name, [string]$Description)

    $existing = [System.Environment]::GetEnvironmentVariable($Name, "User")
    if ($existing) {
        $masked = $existing.Substring(0, [Math]::Min(8, $existing.Length)) + "..."
        Write-Host "   $Name already set (currently: $masked)"
        $overwrite = Read-Host "   Overwrite? (y/N)"
        if ($overwrite -ne "y") {
            return
        }
    }

    $secure = Read-Host "   Paste $Name ($Description)" -AsSecureString
    $plain = [System.Net.NetworkCredential]::new("", $secure).Password
    if ($plain) {
        [System.Environment]::SetEnvironmentVariable($Name, $plain, "User")
        Write-Host "   $Name set." -ForegroundColor Green
    } else {
        Write-Host "   $Name skipped (empty input)."
    }
}

Set-UserEnvSecure -Name "XAI_API_KEY"           -Description "xAI API key from console.x.ai"
Set-UserEnvSecure -Name "GITHUB_TOKEN"          -Description "GitHub PAT with repo scope"
Set-UserEnvSecure -Name "ELEVENLABS_API_KEY"    -Description "ElevenLabs key (optional, voice only)"
Set-UserEnvSecure -Name "CLOUDFLARE_API_TOKEN"  -Description "Cloudflare API token scoped to flashrouter.io"

# ----------------------------------------------------------------------------
# 3. Python deps for the voice client
# ----------------------------------------------------------------------------

Write-Host ""
Write-Host "[3/6] Installing Python deps for voice..." -ForegroundColor Yellow

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "   Python not found. Install Python 3.11+ from python.org first." -ForegroundColor Red
    Write-Host "   Continuing without voice setup..."
} else {
    Push-Location "$PSScriptRoot\..\voice"
    python -m pip install --user --upgrade pip
    python -m pip install --user -r requirements.txt
    Pop-Location
    Write-Host "   Voice deps installed." -ForegroundColor Green
}

# ----------------------------------------------------------------------------
# 4. ffmpeg (needed by pydub for MP3 decoding from ElevenLabs)
# ----------------------------------------------------------------------------

Write-Host ""
Write-Host "[4/6] Checking ffmpeg..." -ForegroundColor Yellow
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    Write-Host "   ffmpeg not found. Installing via winget..."
    try {
        winget install --id Gyan.FFmpeg -e --silent --accept-source-agreements --accept-package-agreements
        Write-Host "   ffmpeg installed. You may need to open a new shell for PATH." -ForegroundColor Green
    } catch {
        Write-Host "   Auto-install failed. Install manually from https://ffmpeg.org/download.html" -ForegroundColor Red
    }
} else {
    Write-Host "   ffmpeg already installed." -ForegroundColor Green
}

# ----------------------------------------------------------------------------
# 5. Write MCP config for the xAI CLI
# ----------------------------------------------------------------------------

Write-Host ""
Write-Host "[5/6] Writing MCP config..." -ForegroundColor Yellow

$mcpConfig = @"
{
  "mcpServers": {
    "github": {
      "command": "gh-mcp-server",
      "args": [],
      "env": { "GITHUB_TOKEN": "`${env:GITHUB_TOKEN}" }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "$env:USERPROFILE\\flashrouter"]
    }
  }
}
"@

$mcpPath = "$env:USERPROFILE\.grok\mcp.json"
New-Item -ItemType Directory -Force -Path (Split-Path $mcpPath) | Out-Null
$mcpConfig | Out-File -FilePath $mcpPath -Encoding utf8
Write-Host "   MCP config written to $mcpPath" -ForegroundColor Green

# ----------------------------------------------------------------------------
# 6. Smoke test
# ----------------------------------------------------------------------------

Write-Host ""
Write-Host "[6/6] Running smoke test..." -ForegroundColor Yellow

$xaiKey = [System.Environment]::GetEnvironmentVariable("XAI_API_KEY", "User")
if (-not $xaiKey) {
    Write-Host "   No XAI_API_KEY set — skipping API ping." -ForegroundColor Yellow
} else {
    try {
        $resp = Invoke-RestMethod -Uri "https://api.x.ai/v1/models" `
            -Headers @{ "Authorization" = "Bearer $xaiKey" } `
            -Method Get
        Write-Host "   xAI API reachable. Models available: $($resp.data.Count)" -ForegroundColor Green
    } catch {
        Write-Host "   xAI API ping failed: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Setup complete." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  - Open a NEW PowerShell window so env vars load"
Write-Host "  - Run the voice client:   cd ..\voice; python voice_client.py"
Write-Host "  - Run the local Grok CLI: grok"
Write-Host ""
Write-Host "If you ever leak a key, rotate it at https://console.x.ai/team/default/api-keys"
Write-Host "then run: bash ops/scripts/rotate-key.sh"

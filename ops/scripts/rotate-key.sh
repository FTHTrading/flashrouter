#!/usr/bin/env bash
# Rotate the XAI_API_KEY across every machine that uses it.
#
# Run this WHEN:
#   - You've leaked a key (chat, Slack, GitHub push)
#   - Quarterly rotation
#   - A team member departs
#   - You're paranoid (good)
#
# This script:
#   1. Prints the revocation URL
#   2. Waits for you to revoke + generate a fresh key
#   3. Updates the server env file
#   4. Restarts the agent service
#   5. Tells you how to update your local Windows box
#
# Usage:  bash ops/scripts/rotate-key.sh

set -euo pipefail

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m"

echo "=============================="
echo "  xAI API key rotation"
echo "=============================="
echo ""
echo -e "${YELLOW}STEP 1${NC} — Revoke the old key:"
echo "  Open: https://console.x.ai/team/default/api-keys"
echo "  Delete the current FlashRouter ops key."
echo ""
read -p "Press ENTER when revoked..."

echo ""
echo -e "${YELLOW}STEP 2${NC} — Generate a fresh key:"
echo "  Same page: Create API Key"
echo "  Name it: flashrouter-ops-$(date +%Y%m%d)"
echo "  Copy the key (it's only shown once)."
echo ""

read -p "Paste the new key (input hidden): " -s NEW_KEY
echo ""

if [[ -z "$NEW_KEY" ]]; then
    echo -e "${RED}No key provided. Aborting.${NC}"
    exit 1
fi
if [[ ! "$NEW_KEY" =~ ^xai- ]]; then
    echo -e "${RED}That doesn't look like an xAI key (should start with xai-).${NC}"
    exit 1
fi

# ----------------------------------------------------------------------------
# Update server env file (if we're on the server)
# ----------------------------------------------------------------------------

ENV_FILE=/etc/flashrouter-agent.env

if [[ -f "$ENV_FILE" ]]; then
    echo ""
    echo -e "${YELLOW}STEP 3${NC} — Updating $ENV_FILE..."
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}Need sudo to edit $ENV_FILE. Re-run with sudo.${NC}"
        exit 1
    fi
    # Replace the XAI_API_KEY= line (or add it if missing)
    if grep -q "^XAI_API_KEY=" "$ENV_FILE"; then
        sed -i "s|^XAI_API_KEY=.*|XAI_API_KEY=$NEW_KEY|" "$ENV_FILE"
    else
        echo "XAI_API_KEY=$NEW_KEY" >> "$ENV_FILE"
    fi
    chmod 600 "$ENV_FILE"
    echo -e "  ${GREEN}OK${NC} Server env file updated."

    echo ""
    echo -e "${YELLOW}STEP 4${NC} — Restarting flashrouter-agent..."
    systemctl restart flashrouter-agent
    sleep 2
    if systemctl is-active --quiet flashrouter-agent; then
        echo -e "  ${GREEN}OK${NC} Agent restarted and healthy."
    else
        echo -e "  ${RED}FAIL${NC} Agent failed to restart. Check: journalctl -u flashrouter-agent -n 50"
        exit 1
    fi
else
    echo ""
    echo "(No server env file found — skipping server update.)"
fi

# ----------------------------------------------------------------------------
# Verify the new key works
# ----------------------------------------------------------------------------

echo ""
echo -e "${YELLOW}STEP 5${NC} — Verifying new key..."
if curl -sf -H "Authorization: Bearer $NEW_KEY" https://api.x.ai/v1/models >/dev/null; then
    echo -e "  ${GREEN}OK${NC} New key works."
else
    echo -e "  ${RED}FAIL${NC} New key rejected by xAI. Check console.x.ai."
    exit 1
fi

# ----------------------------------------------------------------------------
# Reminders
# ----------------------------------------------------------------------------

echo ""
echo "=============================="
echo -e "${GREEN}Rotation complete.${NC}"
echo "=============================="
echo ""
echo "REMINDERS — update the key on every other machine that uses it:"
echo ""
echo "  Windows (your local box) — open PowerShell:"
echo "    \$secure = Read-Host -AsSecureString 'Paste new key'"
echo "    \$plain  = [System.Net.NetworkCredential]::new('', \$secure).Password"
echo "    [System.Environment]::SetEnvironmentVariable('XAI_API_KEY', \$plain, 'User')"
echo "    # Then close + reopen all terminals"
echo ""
echo "  Voice client — restart it so it reads the new env var"
echo ""
echo "  CI / GitHub Actions — Settings → Secrets → update XAI_API_KEY"
echo ""

unset NEW_KEY

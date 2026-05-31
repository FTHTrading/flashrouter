#!/usr/bin/env bash
# FlashRouter Ops — Linux server setup
# ----------------------------------------------------------------------------
# Installs the agent as a systemd service on a Debian/Ubuntu VPS.
# Hardened: dedicated user, read-only /etc env file, minimal capabilities.
#
# Usage:
#   sudo bash server-setup.sh
# ----------------------------------------------------------------------------

set -euo pipefail

# ----------------------------------------------------------------------------
# Pre-flight
# ----------------------------------------------------------------------------

if [[ $EUID -ne 0 ]]; then
    echo "Run with sudo: sudo bash server-setup.sh"
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "[setup] repo root: $REPO_ROOT"

# ----------------------------------------------------------------------------
# 1. System packages
# ----------------------------------------------------------------------------

echo "[1/7] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    python3 python3-venv python3-pip \
    git curl jq ca-certificates \
    build-essential pkg-config

# GitHub CLI
if ! command -v gh >/dev/null 2>&1; then
    echo "[1/7] Installing GitHub CLI..."
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list
    apt-get update -qq
    apt-get install -y -qq gh
fi

# Foundry (forge, cast, anvil)
if ! command -v forge >/dev/null 2>&1; then
    echo "[1/7] Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
    /root/.foundry/bin/foundryup
    ln -sf /root/.foundry/bin/forge /usr/local/bin/forge
    ln -sf /root/.foundry/bin/cast  /usr/local/bin/cast
    ln -sf /root/.foundry/bin/anvil /usr/local/bin/anvil
fi

# ----------------------------------------------------------------------------
# 2. Create the agent user
# ----------------------------------------------------------------------------

echo "[2/7] Creating flashrouter-agent user..."
if ! id flashrouter-agent >/dev/null 2>&1; then
    useradd -r -m -d /var/lib/flashrouter-agent -s /bin/bash flashrouter-agent
fi

# Give the user a checkout of the repo
AGENT_HOME=/var/lib/flashrouter-agent
AGENT_REPO=$AGENT_HOME/flashrouter

if [[ ! -d $AGENT_REPO ]]; then
    sudo -u flashrouter-agent git clone https://github.com/FTHTrading/flashrouter.git "$AGENT_REPO"
else
    sudo -u flashrouter-agent git -C "$AGENT_REPO" pull --ff-only
fi

# ----------------------------------------------------------------------------
# 3. Python venv + dependencies
# ----------------------------------------------------------------------------

echo "[3/7] Setting up Python venv..."
VENV=$AGENT_HOME/venv
sudo -u flashrouter-agent python3 -m venv "$VENV"
sudo -u flashrouter-agent "$VENV/bin/pip" install --upgrade pip
sudo -u flashrouter-agent "$VENV/bin/pip" install -r "$AGENT_REPO/ops/agent/requirements.txt"

# ----------------------------------------------------------------------------
# 4. Environment file (secrets live here, mode 600, root-owned)
# ----------------------------------------------------------------------------

echo "[4/7] Setting up secrets..."
ENV_FILE=/etc/flashrouter-agent.env

if [[ ! -f $ENV_FILE ]]; then
    cat > "$ENV_FILE" <<'EOF'
# FlashRouter agent secrets. Mode 600, root-owned.
# Edit this file to set real values, then: systemctl restart flashrouter-agent

XAI_API_KEY=
GITHUB_TOKEN=
GROK_MODEL=grok-4-latest
AGENT_TIER=1
POLL_INTERVAL_MIN=5
DAILY_BUDGET_USD=5
DRY_RUN=false
# Optional webhook for notifications (Discord, Slack, ntfy)
NOTIFY_WEBHOOK_URL=
EOF
    chmod 600 "$ENV_FILE"
    chown root:root "$ENV_FILE"
    echo ""
    echo "  ====================================================="
    echo "  EDIT /etc/flashrouter-agent.env TO SET YOUR API KEYS"
    echo "  Then run: sudo systemctl start flashrouter-agent"
    echo "  ====================================================="
    echo ""
else
    echo "[4/7] $ENV_FILE already exists — leaving untouched."
fi

# ----------------------------------------------------------------------------
# 5. systemd unit
# ----------------------------------------------------------------------------

echo "[5/7] Installing systemd unit..."
cp "$AGENT_REPO/ops/setup/flashrouter-agent.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable flashrouter-agent.service
echo "[5/7] Service enabled (will start at boot)."

# ----------------------------------------------------------------------------
# 6. Authenticate gh as the agent user (interactive — operator runs this)
# ----------------------------------------------------------------------------

echo "[6/7] GitHub auth..."
echo "  Run as the agent user when ready:"
echo "    sudo -u flashrouter-agent gh auth login --with-token < /path/to/your-token.txt"
echo "  Or: sudo -u flashrouter-agent gh auth login (interactive)"

# ----------------------------------------------------------------------------
# 7. Smoke test
# ----------------------------------------------------------------------------

echo "[7/7] Smoke test..."
if [[ -s $ENV_FILE ]] && grep -q "^XAI_API_KEY=." "$ENV_FILE"; then
    echo "  XAI_API_KEY set in $ENV_FILE — ready to start."
    echo "  Start now with: sudo systemctl start flashrouter-agent"
    echo "  Tail logs:      journalctl -u flashrouter-agent -f"
else
    echo "  XAI_API_KEY NOT set yet. Edit $ENV_FILE first."
fi

echo ""
echo "================================================"
echo "Setup complete."
echo "================================================"

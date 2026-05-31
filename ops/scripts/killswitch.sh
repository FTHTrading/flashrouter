#!/usr/bin/env bash
# Emergency stop for the FlashRouter Grok agent.
#
# Use when:
#   - Agent is misbehaving
#   - You're investigating an incident and want it frozen
#   - xAI bill is spiking
#   - You see a destructive action queued in pending-approvals/
#
# Effects:
#   1. Stops the systemd service (if installed)
#   2. Disables it from auto-restarting at boot
#   3. Marks all pending approvals as DENIED
#   4. Writes a killswitch marker that the agent checks on start
#
# Usage:
#   sudo bash ops/scripts/killswitch.sh         # stop everything
#   sudo bash ops/scripts/killswitch.sh release # re-enable

set -euo pipefail

ACTION="${1:-stop}"
KILLSWITCH_FILE=/var/lib/flashrouter-agent/KILLSWITCH

case "$ACTION" in
    stop|"")
        echo "[killswitch] STOPPING flashrouter-agent..."

        if systemctl list-unit-files | grep -q flashrouter-agent.service; then
            systemctl stop flashrouter-agent || true
            systemctl disable flashrouter-agent || true
            echo "[killswitch] systemd service stopped + disabled"
        fi

        # Mark all pending approvals as denied
        PENDING=/var/lib/flashrouter-agent/flashrouter/ops/logs/pending-approvals
        if [[ -d $PENDING ]]; then
            for f in "$PENDING"/*.json; do
                [[ -f $f ]] || continue
                sed -i 's/"status": *"pending"/"status": "denied"/' "$f"
            done
            echo "[killswitch] pending approvals denied"
        fi

        # Killswitch marker
        mkdir -p "$(dirname "$KILLSWITCH_FILE")"
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) killswitch engaged by $(whoami)" > "$KILLSWITCH_FILE"
        echo "[killswitch] marker file: $KILLSWITCH_FILE"
        echo ""
        echo "Agent is HALTED. Re-enable with:"
        echo "    sudo bash $0 release"
        ;;

    release)
        echo "[killswitch] RELEASING flashrouter-agent..."
        rm -f "$KILLSWITCH_FILE"
        if systemctl list-unit-files | grep -q flashrouter-agent.service; then
            systemctl enable flashrouter-agent
            systemctl start flashrouter-agent
            sleep 2
            if systemctl is-active --quiet flashrouter-agent; then
                echo "[killswitch] agent restarted and healthy"
            else
                echo "[killswitch] agent FAILED to restart — check: journalctl -u flashrouter-agent -n 100"
                exit 1
            fi
        fi
        echo "[killswitch] released"
        ;;

    *)
        echo "Usage: $0 [stop|release]"
        exit 1
        ;;
esac

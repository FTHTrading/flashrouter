#!/usr/bin/env bash
# Approve or deny a pending agent action.
#
# Usage:
#   bash ops/scripts/approve.sh <request_id>          # approve
#   bash ops/scripts/approve.sh <request_id> deny     # deny
#   bash ops/scripts/approve.sh                       # list pending

set -euo pipefail

PENDING_DIR=/var/lib/flashrouter-agent/flashrouter/ops/logs/pending-approvals
# Fallback if running outside the agent's home (e.g., during dev on your laptop)
if [[ ! -d $PENDING_DIR ]]; then
    PENDING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../logs/pending-approvals" 2>/dev/null && pwd || echo "")"
fi

if [[ -z "$PENDING_DIR" || ! -d $PENDING_DIR ]]; then
    echo "No pending approvals directory found."
    exit 1
fi

REQ_ID="${1:-}"
DECISION="${2:-approve}"

if [[ -z "$REQ_ID" ]]; then
    echo "Pending approvals:"
    for f in "$PENDING_DIR"/*.json; do
        [[ -f $f ]] || continue
        echo "  ---"
        cat "$f"
    done
    echo ""
    echo "Approve:  bash $0 <id>"
    echo "Deny:     bash $0 <id> deny"
    exit 0
fi

FILE="$PENDING_DIR/${REQ_ID}.json"
if [[ ! -f $FILE ]]; then
    echo "No pending request with id: $REQ_ID"
    exit 1
fi

case "$DECISION" in
    approve|"")
        sed -i 's/"status": *"pending"/"status": "approved"/' "$FILE"
        echo "[approve] $REQ_ID approved"
        ;;
    deny)
        sed -i 's/"status": *"pending"/"status": "denied"/' "$FILE"
        echo "[approve] $REQ_ID denied"
        ;;
    *)
        echo "Decision must be 'approve' or 'deny'"
        exit 1
        ;;
esac

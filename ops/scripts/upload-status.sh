#!/usr/bin/env bash
# upload-status.sh — VPS agent self-report uploader.
#
# Runs every 5 minutes via /etc/cron.d/flashrouter-agent-status. Snapshots the
# agent's health (systemd status, last cycle, audit tail, pending approvals,
# budget burn) and uploads as JSON to a GitHub Gist named
# "flashrouter-agent-status". The 7 AM weekday briefing reads from that gist.
#
# Why a gist instead of an HTTP endpoint?
#   - Zero new infra to operate
#   - Already authenticated (we have a GITHUB_TOKEN)
#   - Private gists are private; only the briefing cron with your token sees it
#   - Auditable history (gist revisions)
#
# Requirements on the VPS:
#   - gh CLI authenticated as a user with `gist` scope
#   - jq, systemctl, journalctl
#   - Run as the flashrouter-agent user (set in cron entry)

set -euo pipefail

GIST_DESCRIPTION="flashrouter-agent-status"
AUDIT_LOG="${AGENT_AUDIT_LOG:-/var/lib/flashrouter-agent/flashrouter/ops/logs/audit.jsonl}"
PENDING_DIR="${AGENT_PENDING_DIR:-/var/lib/flashrouter-agent/flashrouter/ops/logs/pending-approvals}"
ENV_FILE="${AGENT_ENV_FILE:-/etc/flashrouter-agent.env}"

# ─────────────────────────────────────────────────────────────────────────
#                          COLLECT STATE
# ─────────────────────────────────────────────────────────────────────────

now_iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

service_active=false
if systemctl is-active --quiet flashrouter-agent 2>/dev/null; then
    service_active=true
fi

# Last successful cycle = most recent cycle_complete entry in the audit log
last_cycle_at="null"
if [[ -r "$AUDIT_LOG" ]]; then
    last_cycle_at=$(grep -E '"action":\s*"cycle_complete"' "$AUDIT_LOG" 2>/dev/null \
        | tail -1 \
        | jq -r '.iso // "null"' 2>/dev/null || echo "null")
fi

# Recent audit tail (last 100 lines), parsed to JSON array
audit_tail="[]"
if [[ -r "$AUDIT_LOG" ]]; then
    audit_tail=$(tail -100 "$AUDIT_LOG" 2>/dev/null | jq -s '.' 2>/dev/null || echo "[]")
fi

# Pending approvals — read every *.json file in pending-approvals/
pending_approvals="[]"
if [[ -d "$PENDING_DIR" ]]; then
    pending_approvals=$(find "$PENDING_DIR" -maxdepth 1 -name "*.json" -type f 2>/dev/null \
        | xargs -r -I {} cat {} \
        | jq -s '[.[] | select(.status == "pending")]' 2>/dev/null || echo "[]")
fi

# Denied or timed-out actions in the last 24 hours
twenty_four_hours_ago_epoch=$(date -d "24 hours ago" +%s 2>/dev/null || date -v-24H +%s 2>/dev/null || echo 0)
denied_since_yesterday="[]"
if [[ -r "$AUDIT_LOG" ]]; then
    denied_since_yesterday=$(tail -2000 "$AUDIT_LOG" 2>/dev/null \
        | jq -s --argjson cutoff "$twenty_four_hours_ago_epoch" \
            '[.[] | select(.ts >= $cutoff) | select(.action == "approval_denied" or .action == "approval_timeout" or .action == "cycle_exception" or .action == "budget_halt" or .action == "grok_error")]' \
        2>/dev/null || echo "[]")
fi

# Budget burn (today)
budget_cap_usd=$(grep -E '^DAILY_BUDGET_USD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "5")
today_start_epoch=$(date -d "today 00:00 UTC" +%s 2>/dev/null || date -u -j -f "%Y-%m-%d" "$(date -u +%Y-%m-%d)" +%s 2>/dev/null || echo 0)
# Sum approximated spend from cycle_complete records that include token counts.
# Since the audit log stores result as a string, we approximate by counting cycles today.
# Real spend tracking happens in-process; this is a best-effort observability metric.
cycles_today=$(tail -2000 "$AUDIT_LOG" 2>/dev/null \
    | jq -s --argjson cutoff "$today_start_epoch" \
        '[.[] | select(.ts >= $cutoff) | select(.action == "cycle_complete")] | length' \
    2>/dev/null || echo 0)
# Rough estimate: $0.02 per cycle (will be replaced once agent tracks exact spend)
budget_used_usd=$(awk "BEGIN { printf \"%.2f\", $cycles_today * 0.02 }")

# ─────────────────────────────────────────────────────────────────────────
#                          BUILD JSON PAYLOAD
# ─────────────────────────────────────────────────────────────────────────

payload=$(jq -n \
    --arg ts "$(now_iso)" \
    --arg hostname "$(hostname)" \
    --argjson service_active "$service_active" \
    --arg last_cycle_at "$last_cycle_at" \
    --argjson audit_tail_recent "$audit_tail" \
    --argjson pending_approvals "$pending_approvals" \
    --argjson denied_since_yesterday "$denied_since_yesterday" \
    --argjson budget_used_usd "$budget_used_usd" \
    --argjson budget_cap_usd "$budget_cap_usd" \
    '{
        schema_version: 1,
        ts: $ts,
        hostname: $hostname,
        service_active: $service_active,
        last_cycle_at: $last_cycle_at,
        audit_tail_recent: $audit_tail_recent,
        pending_approvals: $pending_approvals,
        denied_since_yesterday: $denied_since_yesterday,
        budget_used_usd: $budget_used_usd,
        budget_cap_usd: $budget_cap_usd
    }')

# ─────────────────────────────────────────────────────────────────────────
#                          UPLOAD TO GIST
# ─────────────────────────────────────────────────────────────────────────

# Find existing gist by description
existing_gist_id=$(gh api 'gists' --jq ".[] | select(.description == \"${GIST_DESCRIPTION}\") | .id" 2>/dev/null | head -1)

tmp_payload=$(mktemp)
echo "$payload" > "$tmp_payload"
trap 'rm -f "$tmp_payload"' EXIT

if [[ -n "$existing_gist_id" ]]; then
    # Update existing gist
    gh api -X PATCH "gists/${existing_gist_id}" \
        -f description="${GIST_DESCRIPTION}" \
        --raw-field "files[status.json][content]=$(cat "$tmp_payload")" \
        >/dev/null
    echo "[upload-status] updated gist ${existing_gist_id}"
else
    # Create new gist (private — gh's default for `gh gist create` is secret)
    gh gist create \
        --desc "${GIST_DESCRIPTION}" \
        --filename "status.json" \
        "$tmp_payload" \
        >/dev/null
    echo "[upload-status] created new gist"
fi

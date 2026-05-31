#!/usr/bin/env bash
# Quick "is everything alive" check for the FlashRouter ops stack.
#
# Usage:  bash ops/scripts/health-check.sh
# Exits 0 if all green, non-zero if anything is red.

set -uo pipefail

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m"

pass=0
fail=0
warn=0

check() {
    local label="$1"
    local cmd="$2"
    if eval "$cmd" >/dev/null 2>&1; then
        echo -e "  ${GREEN}OK${NC}    $label"
        ((pass++))
    else
        echo -e "  ${RED}FAIL${NC}  $label"
        ((fail++))
    fi
}

check_optional() {
    local label="$1"
    local cmd="$2"
    if eval "$cmd" >/dev/null 2>&1; then
        echo -e "  ${GREEN}OK${NC}    $label"
        ((pass++))
    else
        echo -e "  ${YELLOW}WARN${NC}  $label (optional)"
        ((warn++))
    fi
}

echo "=============================="
echo "  FlashRouter health check"
echo "=============================="
echo ""

echo "Environment:"
check "XAI_API_KEY set"          '[[ -n "${XAI_API_KEY:-}" ]]'
check "GITHUB_TOKEN set"         '[[ -n "${GITHUB_TOKEN:-}" ]]'
check_optional "ELEVENLABS_API_KEY set" '[[ -n "${ELEVENLABS_API_KEY:-}" ]]'
check_optional "CLOUDFLARE_API_TOKEN set" '[[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]'

echo ""
echo "Binaries on PATH:"
check "git"   "command -v git"
check "gh"   "command -v gh"
check "forge" "command -v forge"
check "cast"  "command -v cast"
check_optional "docker" "command -v docker"
check_optional "node"   "command -v node"
check_optional "python3" "command -v python3"

echo ""
echo "API reachability:"
if [[ -n "${XAI_API_KEY:-}" ]]; then
    check "xAI API responds" \
        'curl -sf -H "Authorization: Bearer $XAI_API_KEY" https://api.x.ai/v1/models'
fi
check "GitHub API responds" 'curl -sf https://api.github.com/zen'
check_optional "Cloudflare API responds (if token set)" \
    '[[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] || curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify'

echo ""
echo "Repo state:"
check "git working tree exists" "git rev-parse --git-dir"
check_optional "no uncommitted changes" "[[ -z \$(git status --porcelain) ]]"

echo ""
echo "Agent (if installed):"
check_optional "systemd service exists" "systemctl cat flashrouter-agent"
check_optional "systemd service active"  "systemctl is-active --quiet flashrouter-agent"

echo ""
echo "------------------------------"
echo "  Pass: $pass | Warn: $warn | Fail: $fail"
echo "------------------------------"

exit $([[ $fail -eq 0 ]] && echo 0 || echo 1)

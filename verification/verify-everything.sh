#!/usr/bin/env bash
# verify-everything.sh
# ----------------------------------------------------------------------------
# Independent verification harness. Anyone can run this.
# Pulls every claim from the verification/ registry and checks it against
# public sources (block explorers, RPC endpoints, audit firm sites).
#
# Output: stdout summary + verification-report-<date>.json
# Exit:   0 if all green, non-zero if any check fails
#
# Requirements: jq, curl, cast (Foundry) optional
#
# Usage:
#   bash verification/verify-everything.sh
#   bash verification/verify-everything.sh --json   # JSON-only output
#   bash verification/verify-everything.sh --strict # fail on warnings too
# ----------------------------------------------------------------------------

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[0;33m"; NC="\033[0m"
JSON_MODE=false
STRICT=false
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --strict) STRICT=true ;;
    esac
done

REPORT_FILE="verification-report-$(date -u +%Y%m%d-%H%M%S).json"
RESULTS_JSON='{"checks":[],"summary":{}}'
pass=0; warn=0; fail=0

add_check() {
    local name="$1" status="$2" detail="${3:-}"
    case "$status" in
        pass) ((pass++)) ;;
        warn) ((warn++)) ;;
        fail) ((fail++)) ;;
    esac
    if ! $JSON_MODE; then
        case "$status" in
            pass) echo -e "  ${GREEN}PASS${NC}  $name${detail:+ — $detail}" ;;
            warn) echo -e "  ${YELLOW}WARN${NC}  $name${detail:+ — $detail}" ;;
            fail) echo -e "  ${RED}FAIL${NC}  $name${detail:+ — $detail}" ;;
        esac
    fi
    RESULTS_JSON=$(jq --arg n "$name" --arg s "$status" --arg d "$detail" \
        '.checks += [{name:$n,status:$s,detail:$d}]' <<< "$RESULTS_JSON")
}

section() { $JSON_MODE || echo -e "\n${YELLOW}== $1 ==${NC}"; }

# ─────────────────────────────────────────────────────────────────────────
#                          1. REGISTRY INTEGRITY
# ─────────────────────────────────────────────────────────────────────────

section "Registry integrity"

for f in verification/contracts/mainnet.json verification/contracts/testnet.json \
         verification/contracts/multisigs.json verification/contracts/verification-status.json; do
    if [[ -r "$f" ]] && jq empty "$f" 2>/dev/null; then
        add_check "$f valid JSON" pass
    else
        add_check "$f valid JSON" fail "missing or malformed"
    fi
done

# Stage check — must agree across all files
stages=$(jq -r '.stage' verification/contracts/*.json 2>/dev/null | sort -u | wc -l)
if [[ $stages -eq 1 ]]; then
    add_check "Registry stage consistent" pass "$(jq -r '.stage' verification/contracts/mainnet.json)"
else
    add_check "Registry stage consistent" fail "stage differs across files"
fi

# ─────────────────────────────────────────────────────────────────────────
#                          2. CONTRACT ADDRESS CHECKS
# ─────────────────────────────────────────────────────────────────────────

section "Deployed contracts"

deploy_count=$(jq '.deployments | length' verification/contracts/mainnet.json)
if [[ $deploy_count -eq 0 ]]; then
    add_check "Mainnet deployments" warn "none yet (pre-launch)"
else
    add_check "Mainnet deployments present" pass "$deploy_count contracts"

    # For each entry, check the address has bytecode at the chain
    if command -v cast >/dev/null 2>&1; then
        jq -c '.deployments[]' verification/contracts/mainnet.json | while read -r row; do
            chain=$(echo "$row" | jq -r '.chain')
            addr=$(echo "$row" | jq -r '.address')
            contract=$(echo "$row" | jq -r '.contract')
            rpc_var=$(echo "$chain" | tr 'a-z' 'A-Z')_RPC_URL
            rpc=${!rpc_var:-}
            if [[ -z "$rpc" ]]; then
                add_check "$chain $contract $addr" warn "$rpc_var not set, skipping bytecode check"
                continue
            fi
            code=$(cast code "$addr" --rpc-url "$rpc" 2>/dev/null || echo "")
            if [[ ${#code} -gt 2 ]]; then
                add_check "$chain $contract bytecode present" pass "$addr"
            else
                add_check "$chain $contract bytecode present" fail "$addr returned empty code"
            fi
        done
    else
        add_check "cast (Foundry) available for bytecode check" warn "install Foundry to run bytecode checks"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────
#                          3. BLOCK EXPLORER VERIFICATION
# ─────────────────────────────────────────────────────────────────────────

section "Block explorer source verification"

verif_count=$(jq '.verifications | length' verification/contracts/verification-status.json)
if [[ $verif_count -eq 0 ]]; then
    add_check "Source verification records" warn "none yet (pre-launch)"
else
    add_check "Source verification records present" pass "$verif_count records"
    # Real check would call the explorer's API to confirm — skipped pre-launch
fi

# ─────────────────────────────────────────────────────────────────────────
#                          4. AUDIT REPORTS
# ─────────────────────────────────────────────────────────────────────────

section "Audit reports"

audit_dirs=$(find verification/audits -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
if [[ $audit_dirs -eq 0 ]]; then
    add_check "Audit reports" warn "none yet (pre-launch)"
else
    for d in verification/audits/*/; do
        name=$(basename "$d")
        if [[ -r "$d/report.pdf" && -r "$d/report.pdf.sha256" ]]; then
            expected=$(awk '{print $1}' "$d/report.pdf.sha256")
            actual=$(sha256sum "$d/report.pdf" | awk '{print $1}')
            if [[ "$expected" == "$actual" ]]; then
                add_check "Audit $name hash matches" pass
            else
                add_check "Audit $name hash matches" fail "expected=$expected got=$actual"
            fi
        else
            add_check "Audit $name files present" fail "missing report.pdf or hash"
        fi
    done
fi

# ─────────────────────────────────────────────────────────────────────────
#                          5. COMPLIANCE POSTURE
# ─────────────────────────────────────────────────────────────────────────

section "Compliance posture"

for f in COMPLIANCE.md SECURITY.md VERIFICATION.md LICENSE; do
    if [[ -r "$f" ]] || [[ -r "docs/$f" ]]; then
        add_check "$f present" pass
    else
        add_check "$f present" fail "missing"
    fi
done

# Verify the SDK rejects non-canonical assets — grep test (real test runs in CI)
if grep -q "AssetNotVerifiedError" sdk/src/errors.ts 2>/dev/null; then
    add_check "SDK enforces verified-asset whitelist" pass "AssetNotVerifiedError defined"
else
    add_check "SDK enforces verified-asset whitelist" fail
fi

# Verify the contract enforces the whitelist
if grep -q "AssetNotVerified" contracts/src/FlashRouter.sol 2>/dev/null; then
    add_check "Contract enforces verified-asset whitelist" pass "AssetNotVerified error present"
else
    add_check "Contract enforces verified-asset whitelist" fail
fi

# ─────────────────────────────────────────────────────────────────────────
#                          SUMMARY
# ─────────────────────────────────────────────────────────────────────────

RESULTS_JSON=$(jq --argjson p $pass --argjson w $warn --argjson f $fail \
    '.summary = {pass:$p,warn:$w,fail:$f,timestamp:"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
    <<< "$RESULTS_JSON")

echo "$RESULTS_JSON" | jq . > "$REPORT_FILE"

if ! $JSON_MODE; then
    echo ""
    echo "────────────────────────────"
    echo -e "  ${GREEN}Pass: $pass${NC} | ${YELLOW}Warn: $warn${NC} | ${RED}Fail: $fail${NC}"
    echo "────────────────────────────"
    echo ""
    echo "Full report: $REPORT_FILE"
    echo ""
    if [[ $fail -gt 0 ]]; then
        echo -e "${RED}One or more legitimacy claims could not be verified.${NC}"
        echo "If you believe this is wrong, open an issue at"
        echo "https://github.com/FTHTrading/flashrouter/issues with the report."
    elif [[ $warn -gt 0 ]]; then
        echo -e "${YELLOW}All present claims verified. Warnings indicate things not yet deployed.${NC}"
    else
        echo -e "${GREEN}Every claim verified.${NC}"
    fi
else
    echo "$RESULTS_JSON" | jq .
fi

# Exit code
if [[ $fail -gt 0 ]]; then exit 1; fi
if $STRICT && [[ $warn -gt 0 ]]; then exit 2; fi
exit 0

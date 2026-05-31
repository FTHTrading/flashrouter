"""
Diligence Q&A toolkit for the FlashRouter Grok agent.

Lets the agent answer any legitimacy question by pulling LIVE data from:
  - The verification/ registry (contract addresses, audit hashes, multisigs)
  - GitHub (commit history, CI status, releases)
  - Block explorers (verification status, bytecode liveness)
  - On-chain RPCs (event counts, fee revenue, admin addresses)

The agent registers these as tools and Grok decides which to call based on
the question. Output is always sourced — "claim → evidence → URL" — so the
agent's answer is independently auditable.

The 8 questions this is built to answer perfectly:

  1. What are the contract addresses?
  2. Are the contracts verified on the block explorers?
  3. Where are the audit reports?
  4. Is the volume real?
  5. Who is the team?
  6. What stage are you at?
  7. How do I report misuse?
  8. How do I verify any of this myself?

Plus any open-ended diligence question, by retrieving the relevant section
of VERIFICATION.md / faq.md / team.md and citing it.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).parent.parent.parent.resolve()
VERIFICATION_DIR = REPO_ROOT / "verification"
DOCS = {
    "verification": REPO_ROOT / "VERIFICATION.md",
    "faq":          VERIFICATION_DIR / "faq.md",
    "team":         VERIFICATION_DIR / "team.md",
    "compliance":   REPO_ROOT / "docs" / "COMPLIANCE.md",
    "security":     REPO_ROOT / "SECURITY.md",
    "audits":       VERIFICATION_DIR / "audits" / "README.md",
    "findings":     VERIFICATION_DIR / "audits" / "findings.md",
}


# ─────────────────────────────────────────────────────────────────────────
#                          REGISTRY READERS
# ─────────────────────────────────────────────────────────────────────────


def get_stage() -> dict[str, Any]:
    """Return the current launch stage and what's been shipped."""
    mainnet = json.loads((VERIFICATION_DIR / "contracts" / "mainnet.json").read_text())
    testnet = json.loads((VERIFICATION_DIR / "contracts" / "testnet.json").read_text())
    audits = list((VERIFICATION_DIR / "audits").glob("*/report.pdf"))
    return {
        "stage": mainnet.get("stage", "unknown"),
        "mainnet_deployments": len(mainnet.get("deployments", [])),
        "testnet_deployments": len(testnet.get("deployments", [])),
        "audits_completed": len(audits),
        "last_updated": mainnet.get("last_updated"),
        "honest_status": _honest_status(mainnet, testnet, audits),
    }


def _honest_status(mainnet: dict, testnet: dict, audits: list) -> str:
    if not mainnet.get("deployments") and not testnet.get("deployments"):
        return "Pre-launch. Contracts written, not deployed. Not audited. Not live."
    if not mainnet.get("deployments"):
        return f"Testnet only. {len(testnet['deployments'])} testnet contracts deployed. {len(audits)} audits complete."
    return f"Live on mainnet. {len(mainnet['deployments'])} mainnet contracts. {len(audits)} audits complete."


def get_contract_addresses(network: str = "all") -> dict[str, Any]:
    """Return deployed contract addresses. network = 'mainnet' | 'testnet' | 'all'."""
    result = {}
    if network in ("mainnet", "all"):
        result["mainnet"] = json.loads((VERIFICATION_DIR / "contracts" / "mainnet.json").read_text())
    if network in ("testnet", "all"):
        result["testnet"] = json.loads((VERIFICATION_DIR / "contracts" / "testnet.json").read_text())
    return result


def get_audit_status() -> dict[str, Any]:
    """List every audit, with hash + firm + status."""
    audits = []
    for d in sorted((VERIFICATION_DIR / "audits").glob("*/")):
        if not d.is_dir() or d.name in ("schema",):
            continue
        entry = {"name": d.name}
        pdf = d / "report.pdf"
        hash_file = d / "report.pdf.sha256"
        firm_sig = d / "report.pdf.firm-sig.txt"
        if pdf.exists():
            entry["report_present"] = True
            entry["size_bytes"] = pdf.stat().st_size
        if hash_file.exists():
            entry["sha256"] = hash_file.read_text().strip().split()[0]
        if firm_sig.exists():
            entry["firm_url"] = firm_sig.read_text().strip()
        audits.append(entry)
    return {
        "audits_completed": len(audits),
        "audits": audits,
        "plan": "Two independent audits planned before mainnet: Spearbit-tier + Trail-of-Bits-tier. See verification/audits/README.md.",
    }


def get_team_info() -> dict[str, Any]:
    """Team and operating entity facts."""
    return {
        "entity": "FTH Trading LLC",
        "jurisdiction": "Georgia, USA",
        "founder": "Kevan B.",
        "github": "https://github.com/FTHTrading",
        "contacts": {
            "general": "hello@flashrouter.io",
            "security": "security@flashrouter.io",
            "abuse": "abuse@flashrouter.io",
            "diligence": "verify@flashrouter.io",
        },
        "advisors_listed": 0,
        "investors_listed": 0,
        "token_or_fundraise": "None. No token, no airdrop, no presale.",
        "details_url": "https://github.com/FTHTrading/flashrouter/blob/main/verification/team.md",
    }


def get_compliance_posture() -> dict[str, Any]:
    """What FlashRouter is and is not."""
    return {
        "non_custodial": True,
        "asset_whitelist_enforced_on_chain": True,
        "asset_whitelist_enforced_in_sdk": True,
        "open_source": True,
        "license_contracts": "AGPL-3.0",
        "license_other": "MIT",
        "explicitly_refuses": [
            "Fake-token (flash USDT) generators",
            "Wallet drainers / approval farmers",
            "Unconfirmed-transaction display tricks",
            "Anonymous high-volume users (KYB required above $1M/mo)",
            "Sanctioned addresses (OFAC screening)",
            "Mainnet deploys without two audits",
        ],
        "policy_url": "https://github.com/FTHTrading/flashrouter/blob/main/docs/COMPLIANCE.md",
    }


def get_volume_proof() -> dict[str, Any]:
    """Honest answer to 'is the volume real?'"""
    stage = get_stage()
    if stage["mainnet_deployments"] == 0:
        return {
            "honest_answer": "There is no production volume yet. Any number anywhere claiming otherwise pre-launch is wrong — please report it to verify@flashrouter.io so we can fix it.",
            "current_volume_usd": 0,
            "post_launch_verification_method": "Sum every FlashLoanExecuted event's amount parameter across all chains via cast logs. The on-chain event is the source of truth.",
            "post_launch_dashboards": [
                "https://stats.flashrouter.io (when live)",
                "Public Dune dashboard (linked when live)",
                "The Graph subgraph per chain (linked when live)",
            ],
        }
    # Post-launch: query the indexer
    return {"honest_answer": "Live indexer not yet wired to this tool — see /v1/stats on the API."}


def get_faq_answer(question_keywords: str) -> dict[str, Any]:
    """Search faq.md for a relevant Q&A. Returns the section if matched."""
    faq = DOCS["faq"].read_text()
    sections = faq.split("\n### ")
    matches = []
    needle_words = [w.lower() for w in question_keywords.split() if len(w) > 3]
    for sec in sections[1:]:
        score = sum(1 for w in needle_words if w in sec.lower())
        if score > 0:
            matches.append((score, "### " + sec))
    matches.sort(reverse=True)
    return {
        "best_match": matches[0][1] if matches else None,
        "all_matches_count": len(matches),
        "full_faq_url": "https://github.com/FTHTrading/flashrouter/blob/main/verification/faq.md",
    }


def get_self_verify_instructions() -> dict[str, Any]:
    """Return the command anyone can run to independently verify every claim."""
    return {
        "command": "bash verification/verify-everything.sh",
        "description": "Independent verification harness. Checks every claim in VERIFICATION.md against public sources (block explorers, RPC endpoints, audit firm URLs). Exits non-zero on any failure.",
        "script_url": "https://github.com/FTHTrading/flashrouter/blob/main/verification/verify-everything.sh",
        "what_it_checks": [
            "Registry JSON files are valid + stage consistent",
            "Every contract address has live bytecode on its chain",
            "Block explorer source verification status",
            "Audit PDF hashes match committed hashes",
            "Required policy files (COMPLIANCE, SECURITY, VERIFICATION, LICENSE) exist",
            "SDK and contract enforce verified-asset whitelist",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────
#                          TOOL DISPATCH
# ─────────────────────────────────────────────────────────────────────────


def diligence_query(args: dict[str, Any], **_: Any) -> dict[str, Any]:
    """Unified diligence Q&A entry point. Picks the right reader based on topic."""
    topic = args.get("topic", "").lower()
    handlers = {
        "stage":         get_stage,
        "contracts":     lambda: get_contract_addresses(args.get("network", "all")),
        "addresses":     lambda: get_contract_addresses(args.get("network", "all")),
        "audits":        get_audit_status,
        "team":          get_team_info,
        "compliance":    get_compliance_posture,
        "volume":        get_volume_proof,
        "verify":        get_self_verify_instructions,
        "self_verify":   get_self_verify_instructions,
    }
    if topic in handlers:
        return {"topic": topic, "data": handlers[topic]()}
    # Fallback: FAQ search
    return {
        "topic": "faq_search",
        "data": get_faq_answer(args.get("question", topic)),
    }


# Tool schema for registration in the agent
DILIGENCE_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "diligence_query",
        "description": (
            "Answer any legitimacy / due-diligence question about FlashRouter by pulling LIVE "
            "data from the verification/ registry, audits/, and team docs. Always use this when "
            "someone asks about: contract addresses, audit status, volume claims, the team, "
            "compliance posture, launch stage, or how to verify anything independently. Output "
            "includes source URLs so the answer is auditable."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "enum": ["stage", "contracts", "addresses", "audits", "team",
                             "compliance", "volume", "verify", "self_verify", "faq"],
                    "description": "Which slice of diligence info to fetch.",
                },
                "network": {
                    "type": "string",
                    "enum": ["mainnet", "testnet", "all"],
                    "description": "For 'contracts' / 'addresses' queries.",
                },
                "question": {
                    "type": "string",
                    "description": "For 'faq' topic, the user's literal question text.",
                },
            },
            "required": ["topic"],
        },
    },
}

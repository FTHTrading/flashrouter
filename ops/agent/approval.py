"""
Approval gate for destructive or out-of-tier actions.

The agent calls `requires_approval(tool_name, args, tier)` before any action.
If approval is required, `request_approval` blocks until the human responds
via the webhook callback or times out (deny by default).

In production this would be wired to a Slack interactive button, ntfy push,
or a small Flask endpoint with a one-click approve link. For now we expose
a file-based pending queue + a `tools/approve.py` CLI to approve/deny from
your terminal.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path
from typing import Any

PENDING_DIR = Path(__file__).parent.parent / "logs" / "pending-approvals"
PENDING_DIR.mkdir(parents=True, exist_ok=True)

# Actions that ALWAYS require approval regardless of tier
ALWAYS_APPROVE: set[str] = set()  # populated per repo conventions

# Action argument substrings that trigger approval
DANGER_PATTERNS = ("mainnet", "--broadcast", "--private-key", "--force", "rm -rf")

DEFAULT_APPROVAL_TIMEOUT_SEC = 600  # 10 minutes


def requires_approval(tool_name: str, args: dict[str, Any], tier: int) -> bool:
    """Return True if this action needs human approval."""
    if tool_name in ALWAYS_APPROVE:
        return True

    args_str = json.dumps(args, default=str).lower()
    for pat in DANGER_PATTERNS:
        if pat in args_str:
            return True

    # Tier-3-only destructive ops
    if tier >= 3 and tool_name in {"docker_run"}:
        cmd_args = args.get("args", [])
        if isinstance(cmd_args, list) and any(x in cmd_args for x in ("down", "rm", "kill")):
            return True

    return False


def request_approval(tool_name: str, args: dict[str, Any]) -> bool:
    """Block until approval received. Returns True if approved."""
    request_id = str(uuid.uuid4())[:8]
    pending_file = PENDING_DIR / f"{request_id}.json"
    pending_file.write_text(
        json.dumps(
            {
                "id": request_id,
                "tool": tool_name,
                "args": args,
                "status": "pending",
                "requested_at": time.time(),
            },
            indent=2,
            default=str,
        )
    )

    print(f"[approval] requested: {tool_name} id={request_id}")
    print(f"[approval] approve: bash ops/scripts/approve.sh {request_id}")
    print(f"[approval] deny:    bash ops/scripts/approve.sh {request_id} deny")

    deadline = time.time() + DEFAULT_APPROVAL_TIMEOUT_SEC
    while time.time() < deadline:
        try:
            current = json.loads(pending_file.read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            time.sleep(2)
            continue
        if current.get("status") in {"approved", "denied"}:
            decided = current["status"] == "approved"
            # Move to decided/
            (PENDING_DIR.parent / "decided").mkdir(exist_ok=True)
            pending_file.rename(PENDING_DIR.parent / "decided" / pending_file.name)
            print(f"[approval] {current['status']}: {tool_name} id={request_id}")
            return decided
        time.sleep(3)

    # Timeout = deny
    pending_file.unlink(missing_ok=True)
    print(f"[approval] timeout (deny): {tool_name} id={request_id}")
    return False

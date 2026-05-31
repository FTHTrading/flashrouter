"""
Append-only audit log for every agent action.

Each line is a JSON object. Never overwritten, never reordered. This is what
you read after an incident to understand exactly what the agent did, when,
and why.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

LOG_FILE = Path(__file__).parent.parent / "logs" / "audit.jsonl"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


def audit(action: str, args: Any = None, result: Any = None) -> None:
    """Append one audit record."""
    record = {
        "ts": time.time(),
        "iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "action": action,
        "args": args,
        "result": result if not isinstance(result, dict) else _trim(result),
    }
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, default=str, ensure_ascii=False) + "\n")


def _trim(d: dict[str, Any]) -> dict[str, Any]:
    """Trim very long fields to keep the audit log readable."""
    trimmed: dict[str, Any] = {}
    for k, v in d.items():
        if isinstance(v, str) and len(v) > 1_000:
            trimmed[k] = v[:1_000] + f"... [+{len(v) - 1_000} chars]"
        else:
            trimmed[k] = v
    return trimmed


def tail(n: int = 50) -> list[dict[str, Any]]:
    """Return the last N audit records."""
    if not LOG_FILE.exists():
        return []
    lines = LOG_FILE.read_text(encoding="utf-8").splitlines()
    out = []
    for line in lines[-n:]:
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out

"""
Tool registry for the FlashRouter ops agent.

Each tool has:
  - name: callable from Grok
  - schema: OpenAI/xAI tool schema (used in the API request)
  - min_tier: lowest permission tier that may use it
  - handler: Python callable that executes it

Adding a tool: append to TOOL_REGISTRY, write the handler, restart the agent.
"""

from __future__ import annotations

import json
import shlex
import subprocess
from pathlib import Path
from typing import Any, Callable

REPO_ROOT = Path(__file__).parent.parent.parent.resolve()  # flashrouter/
MAX_OUTPUT = 4_000  # truncate command output sent back to Grok

# ─────────────────────────────────────────────────────────────────────────
#                          COMMAND RUNNER
# ─────────────────────────────────────────────────────────────────────────


def _run(cmd: list[str], cwd: Path | None = None, timeout: int = 60) -> dict[str, Any]:
    """Run a shell command with timeout, return structured result."""
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd or REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        out = (proc.stdout or "")[-MAX_OUTPUT:]
        err = (proc.stderr or "")[-MAX_OUTPUT:]
        return {"exit_code": proc.returncode, "stdout": out, "stderr": err}
    except subprocess.TimeoutExpired:
        return {"exit_code": -1, "stdout": "", "stderr": f"timeout after {timeout}s"}
    except FileNotFoundError as e:
        return {"exit_code": -1, "stdout": "", "stderr": f"command not found: {e}"}


# ─────────────────────────────────────────────────────────────────────────
#                          TOOL HANDLERS
# ─────────────────────────────────────────────────────────────────────────


def tool_read_file(args: dict[str, Any], **_: Any) -> dict[str, Any]:
    path = REPO_ROOT / args["path"]
    if not path.resolve().is_relative_to(REPO_ROOT):
        return {"error": "path traversal blocked"}
    if not path.exists():
        return {"error": f"file not found: {args['path']}"}
    content = path.read_text()
    return {"path": args["path"], "content": content[:MAX_OUTPUT], "truncated": len(content) > MAX_OUTPUT}


def tool_list_files(args: dict[str, Any], **_: Any) -> dict[str, Any]:
    path = REPO_ROOT / args.get("path", ".")
    if not path.resolve().is_relative_to(REPO_ROOT):
        return {"error": "path traversal blocked"}
    if not path.is_dir():
        return {"error": f"not a directory: {args.get('path', '.')}"}
    return {
        "path": str(path.relative_to(REPO_ROOT)),
        "entries": sorted([p.name for p in path.iterdir()]),
    }


def tool_gh_run(args: dict[str, Any], **_: Any) -> dict[str, Any]:
    """Run a gh command. The agent passes the subcommand args; we prepend `gh`."""
    sub = args.get("args", [])
    if not isinstance(sub, list) or not all(isinstance(s, str) for s in sub):
        return {"error": "args must be list of strings"}
    # Block destructive subcommands explicitly
    blocked = {"delete", "transfer", "auth"}
    if sub and sub[0] in blocked:
        return {"error": f"gh subcommand '{sub[0]}' blocked by tool policy"}
    return _run(["gh", *sub])


def tool_git_run(args: dict[str, Any], tier: int = 1) -> dict[str, Any]:
    sub = args.get("args", [])
    if not isinstance(sub, list):
        return {"error": "args must be list of strings"}
    if sub and sub[0] in {"push", "commit"} and tier < 2:
        return {"error": f"git {sub[0]} requires tier 2+"}
    if sub and sub[0] == "push":
        # never push to main, never force-push
        joined = " ".join(sub)
        if "main" in sub or "--force" in joined or "-f" in sub:
            return {"error": "push to main or --force blocked"}
    return _run(["git", *sub])


def tool_forge_run(args: dict[str, Any], **_: Any) -> dict[str, Any]:
    sub = args.get("args", [])
    if not isinstance(sub, list):
        return {"error": "args must be list of strings"}
    joined = " ".join(sub)
    # Block any deploy attempts — those go through approval as a separate tool
    if "--broadcast" in sub or "--private-key" in joined or "script" in sub:
        return {"error": "forge script/broadcast/private-key blocked; use the deploy_testnet tool"}
    return _run(["forge", *sub], cwd=REPO_ROOT / "contracts", timeout=300)


def tool_npm_run(args: dict[str, Any], **_: Any) -> dict[str, Any]:
    sub = args.get("args", [])
    workspace = args.get("workspace", "")
    if not isinstance(sub, list):
        return {"error": "args must be list of strings"}
    cwd = REPO_ROOT / workspace if workspace else REPO_ROOT
    if not cwd.resolve().is_relative_to(REPO_ROOT):
        return {"error": "workspace traversal blocked"}
    return _run(["npm", *sub], cwd=cwd, timeout=600)


def tool_cast_run(args: dict[str, Any], **_: Any) -> dict[str, Any]:
    """READ-ONLY cast commands only. Calls, no sends."""
    sub = args.get("args", [])
    if not isinstance(sub, list) or not sub:
        return {"error": "args must be non-empty list"}
    allowed = {"call", "balance", "block", "chain-id", "code", "estimate", "from-wei", "to-wei",
               "logs", "nonce", "receipt", "storage", "tx", "wallet"}
    if sub[0] not in allowed:
        return {"error": f"cast subcommand '{sub[0]}' not on read-only allowlist"}
    if "send" in sub or "--private-key" in " ".join(sub):
        return {"error": "cast send / private-key blocked"}
    return _run(["cast", *sub], timeout=30)


def tool_docker_run(args: dict[str, Any], tier: int = 1) -> dict[str, Any]:
    sub = args.get("args", [])
    if not isinstance(sub, list):
        return {"error": "args must be list of strings"}
    if tier < 2:
        return {"error": "docker requires tier 2+"}
    return _run(["docker", *sub], timeout=120)


def tool_notify(args: dict[str, Any], **_: Any) -> dict[str, Any]:
    title = args.get("title", "FlashRouter")
    body = args.get("body", "")
    channel = args.get("channel", "in_app")
    # The agent's notify is just an audit + webhook call. The actual send_notification
    # mechanism on the platform is invoked by the cron we already scheduled.
    # Here we use a webhook (Discord/Slack/ntfy) configured via NOTIFY_WEBHOOK_URL.
    import os
    import httpx

    webhook = os.environ.get("NOTIFY_WEBHOOK_URL")
    if not webhook:
        return {"sent": False, "reason": "NOTIFY_WEBHOOK_URL not configured"}
    try:
        with httpx.Client(timeout=10) as c:
            c.post(webhook, json={"title": title, "body": body, "channel": channel})
        return {"sent": True, "title": title, "channel": channel}
    except Exception as e:  # noqa: BLE001
        return {"sent": False, "reason": repr(e)}


# ─────────────────────────────────────────────────────────────────────────
#                          REGISTRY
# ─────────────────────────────────────────────────────────────────────────

TOOL_REGISTRY: list[dict[str, Any]] = [
    {
        "name": "read_file",
        "min_tier": 1,
        "handler": tool_read_file,
        "schema": {
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read a file from the FlashRouter repository.",
                "parameters": {
                    "type": "object",
                    "properties": {"path": {"type": "string"}},
                    "required": ["path"],
                },
            },
        },
    },
    {
        "name": "list_files",
        "min_tier": 1,
        "handler": tool_list_files,
        "schema": {
            "type": "function",
            "function": {
                "name": "list_files",
                "description": "List files in a directory inside the FlashRouter repository.",
                "parameters": {
                    "type": "object",
                    "properties": {"path": {"type": "string", "default": "."}},
                },
            },
        },
    },
    {
        "name": "gh_run",
        "min_tier": 1,
        "handler": tool_gh_run,
        "schema": {
            "type": "function",
            "function": {
                "name": "gh_run",
                "description": "Run a GitHub CLI command. Pass subcommand and args as a list.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "args": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["args"],
                },
            },
        },
    },
    {
        "name": "git_run",
        "min_tier": 1,
        "handler": tool_git_run,
        "schema": {
            "type": "function",
            "function": {
                "name": "git_run",
                "description": "Run a git command. Read at tier 1; write at tier 2+.",
                "parameters": {
                    "type": "object",
                    "properties": {"args": {"type": "array", "items": {"type": "string"}}},
                    "required": ["args"],
                },
            },
        },
    },
    {
        "name": "forge_run",
        "min_tier": 2,
        "handler": tool_forge_run,
        "schema": {
            "type": "function",
            "function": {
                "name": "forge_run",
                "description": "Run Foundry forge command in the contracts/ directory. No deploy scripts.",
                "parameters": {
                    "type": "object",
                    "properties": {"args": {"type": "array", "items": {"type": "string"}}},
                    "required": ["args"],
                },
            },
        },
    },
    {
        "name": "npm_run",
        "min_tier": 2,
        "handler": tool_npm_run,
        "schema": {
            "type": "function",
            "function": {
                "name": "npm_run",
                "description": "Run an npm command inside one of the workspaces (sdk, api, dashboard).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "args": {"type": "array", "items": {"type": "string"}},
                        "workspace": {"type": "string", "enum": ["sdk", "api", "dashboard", ""]},
                    },
                    "required": ["args"],
                },
            },
        },
    },
    {
        "name": "cast_run",
        "min_tier": 1,
        "handler": tool_cast_run,
        "schema": {
            "type": "function",
            "function": {
                "name": "cast_run",
                "description": "Run a READ-ONLY Foundry cast command for on-chain queries.",
                "parameters": {
                    "type": "object",
                    "properties": {"args": {"type": "array", "items": {"type": "string"}}},
                    "required": ["args"],
                },
            },
        },
    },
    {
        "name": "docker_run",
        "min_tier": 2,
        "handler": tool_docker_run,
        "schema": {
            "type": "function",
            "function": {
                "name": "docker_run",
                "description": "Run a docker / docker-compose command. Tier 2+.",
                "parameters": {
                    "type": "object",
                    "properties": {"args": {"type": "array", "items": {"type": "string"}}},
                    "required": ["args"],
                },
            },
        },
    },
    {
        "name": "notify",
        "min_tier": 1,
        "handler": tool_notify,
        "schema": {
            "type": "function",
            "function": {
                "name": "notify",
                "description": "Send a notification to Kevan via the configured webhook (Slack/Discord/ntfy).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "body": {"type": "string"},
                        "channel": {"type": "string", "enum": ["in_app", "push", "email"]},
                    },
                    "required": ["title", "body"],
                },
            },
        },
    },
]


HANDLERS: dict[str, Callable[..., Any]] = {t["name"]: t["handler"] for t in TOOL_REGISTRY}


def dispatch_tool(name: str, args: dict[str, Any], tier: int = 1) -> dict[str, Any]:
    handler = HANDLERS.get(name)
    if not handler:
        return {"error": f"unknown tool: {name}"}
    try:
        return handler(args, tier=tier)
    except Exception as e:  # noqa: BLE001
        return {"error": repr(e)}

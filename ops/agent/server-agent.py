#!/usr/bin/env python3
"""
FlashRouter Server Agent — 24/7 ops loop powered by Grok.

Runs as a systemd service on a Linux VPS. Polls system state every N minutes,
calls Grok to triage, takes whitelisted actions, requests approval for the
rest, notifies the human operator on real signal.

Environment:
    XAI_API_KEY           xAI API key (required)
    GITHUB_TOKEN          GitHub PAT for repo access (required)
    GROK_MODEL            grok-4-latest | grok-beta (default: grok-4-latest)
    AGENT_TIER            1 | 2 | 3 (default: 1 — read-only)
    POLL_INTERVAL_MIN     minutes between health polls (default: 5)
    DAILY_BUDGET_USD      hard cap on xAI spend per day (default: 5)
    NOTIFY_WEBHOOK_URL    optional webhook for push notifications
    DRY_RUN               true | false (default: false)

Usage:
    python server-agent.py --tier=1 --poll=5
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import signal
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx  # type: ignore

from tools import TOOL_REGISTRY, dispatch_tool
from approval import requires_approval, request_approval
from audit_log import audit

# ─────────────────────────────────────────────────────────────────────────
#                              CONFIG
# ─────────────────────────────────────────────────────────────────────────

REPO = "FTHTrading/flashrouter"
PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "flashrouter-operator.md"
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

XAI_API_KEY = os.environ.get("XAI_API_KEY")
if not XAI_API_KEY:
    sys.stderr.write(
        "FATAL: XAI_API_KEY not set. Add it to /etc/flashrouter-agent.env and restart the service.\n"
    )
    sys.exit(1)

GROK_MODEL = os.environ.get("GROK_MODEL", "grok-4-latest")
DAILY_BUDGET_USD = float(os.environ.get("DAILY_BUDGET_USD", "5"))
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"

# ─────────────────────────────────────────────────────────────────────────
#                              GROK CLIENT
# ─────────────────────────────────────────────────────────────────────────

XAI_BASE_URL = "https://api.x.ai/v1"


def grok_chat(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    temperature: float = 0.2,
) -> dict[str, Any]:
    """Call xAI's chat completions endpoint. Returns the full response dict."""
    payload: dict[str, Any] = {
        "model": GROK_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    with httpx.Client(timeout=120) as client:
        resp = client.post(
            f"{XAI_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {XAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


# ─────────────────────────────────────────────────────────────────────────
#                          AGENT LOOP
# ─────────────────────────────────────────────────────────────────────────


class FlashRouterAgent:
    def __init__(self, tier: int, poll_interval_min: int) -> None:
        self.tier = tier
        self.poll_interval = poll_interval_min * 60
        self.system_prompt = self._load_system_prompt()
        self.daily_spend_usd = 0.0
        self.last_daily_reset = datetime.now(timezone.utc).date()
        self.running = True

    def _load_system_prompt(self) -> str:
        prompt = PROMPT_PATH.read_text()
        # Inject runtime context
        prompt += f"\n\n## RUNTIME CONTEXT\n\n- Current tier: **{self.tier}**\n- Repository: {REPO}\n"
        prompt += f"- Dry run: {DRY_RUN}\n"
        prompt += f"- Daily budget: ${DAILY_BUDGET_USD}\n"
        return prompt

    def _reset_daily_budget_if_needed(self) -> None:
        today = datetime.now(timezone.utc).date()
        if today != self.last_daily_reset:
            self.daily_spend_usd = 0.0
            self.last_daily_reset = today

    def _check_budget(self) -> bool:
        self._reset_daily_budget_if_needed()
        if self.daily_spend_usd >= DAILY_BUDGET_USD:
            audit(
                action="budget_halt",
                args={"spent_usd": self.daily_spend_usd, "cap_usd": DAILY_BUDGET_USD},
                result="halted",
            )
            return False
        return True

    def _track_spend(self, response: dict[str, Any]) -> None:
        usage = response.get("usage", {})
        # Rough cost approximation — refine when xAI publishes per-model pricing
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
        # Grok 4 pricing (approx): $5/M input, $15/M output
        cost = (input_tokens / 1_000_000) * 5 + (output_tokens / 1_000_000) * 15
        self.daily_spend_usd += cost

    def run_one_cycle(self) -> None:
        """One health-check cycle: poll state, ask Grok to triage, act/notify."""
        if not self._check_budget():
            return

        cycle_start = datetime.now(timezone.utc).isoformat()

        # Build the cycle prompt
        user_message = (
            f"Health-check cycle at {cycle_start}. "
            f"Run your standard checks: CI status, open PRs, new issues, "
            f"new commits, and Dependabot alerts since the last cycle. "
            f"If anything needs attention, decide whether to handle it (within tier {self.tier}) "
            f"or notify Kevan. If nothing is new, report 'all clear' and end."
        )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_message},
        ]

        # Tool-use loop: Grok can call tools, we execute, return results, repeat
        max_iterations = 10
        for _ in range(max_iterations):
            try:
                response = grok_chat(messages, tools=self._tool_schemas())
            except httpx.HTTPStatusError as e:
                audit(action="grok_error", args={"status": e.response.status_code}, result=str(e))
                return

            self._track_spend(response)
            choice = response["choices"][0]
            message = choice["message"]
            messages.append(message)

            tool_calls = message.get("tool_calls")
            if not tool_calls:
                # Grok is done. Log the final response.
                audit(
                    action="cycle_complete",
                    args={"tier": self.tier},
                    result=message.get("content", ""),
                )
                return

            # Execute every tool call
            for tc in tool_calls:
                tool_name = tc["function"]["name"]
                tool_args = json.loads(tc["function"]["arguments"])

                if requires_approval(tool_name, tool_args, self.tier):
                    approved = request_approval(tool_name, tool_args)
                    if not approved:
                        result = {"approved": False, "message": "human denied"}
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "content": json.dumps(result),
                            }
                        )
                        continue

                if DRY_RUN and tool_name not in {"read_file", "list_files", "gh_repo_view", "audit"}:
                    result = {"dry_run": True, "would_have_executed": tool_args}
                else:
                    result = dispatch_tool(tool_name, tool_args, tier=self.tier)

                audit(action=tool_name, args=tool_args, result=result)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(result),
                    }
                )

    def _tool_schemas(self) -> list[dict[str, Any]]:
        """Return the OpenAI/xAI tool schema for every available tool."""
        return [t["schema"] for t in TOOL_REGISTRY if t.get("min_tier", 1) <= self.tier]

    def run_forever(self) -> None:
        def handle_signal(signum, frame):  # noqa: ARG001
            self.running = False

        signal.signal(signal.SIGTERM, handle_signal)
        signal.signal(signal.SIGINT, handle_signal)

        print(f"[agent] starting at tier {self.tier}, polling every {self.poll_interval}s")
        while self.running:
            try:
                self.run_one_cycle()
            except Exception as e:  # noqa: BLE001
                audit(action="cycle_exception", args={}, result=repr(e))
                print(f"[agent] exception in cycle: {e}", file=sys.stderr)
            # Sleep responsively so SIGTERM is fast
            slept = 0
            while slept < self.poll_interval and self.running:
                time.sleep(min(5, self.poll_interval - slept))
                slept += 5
        print("[agent] shutdown clean")


# ─────────────────────────────────────────────────────────────────────────
#                              MAIN
# ─────────────────────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser(description="FlashRouter Grok-powered ops agent")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], default=int(os.environ.get("AGENT_TIER", 1)))
    parser.add_argument(
        "--poll",
        type=int,
        default=int(os.environ.get("POLL_INTERVAL_MIN", 5)),
        help="Poll interval in minutes",
    )
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    args = parser.parse_args()

    agent = FlashRouterAgent(tier=args.tier, poll_interval_min=args.poll)

    if args.once:
        agent.run_one_cycle()
        return 0

    agent.run_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())

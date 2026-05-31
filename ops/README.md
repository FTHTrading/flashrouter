# FlashRouter Ops — Grok-Powered Operations Layer

This directory turns Grok into a controllable operator for the FlashRouter platform. Three components, one shared brain:

```
┌─────────────────────────────────────────────────────────────────┐
│  LOCAL  (your Windows 11 box)                                    │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐ │
│  │  xAI CLI ("grok")    │   │  voice-client.py                 │ │
│  │  Interactive shell   │   │  mic → Whisper → Grok → 11Labs   │ │
│  └──────────┬───────────┘   └──────────┬───────────────────────┘ │
│             │ XAI_API_KEY              │ XAI_API_KEY              │
└─────────────┼──────────────────────────┼──────────────────────────┘
              │                          │
              ▼                          ▼
        ┌────────────────────────────────────────┐
        │   xAI API  (api.x.ai)                  │
        │   Grok 4 / Grok Beta                   │
        └────────────────┬───────────────────────┘
                         │
                         │   MCP tools (read-only repo,
                         │   CI status, on-chain stats,
                         │   API health, etc.)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVER  (Linux VPS, always-on)                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  flashrouter-agent  (systemd service)                        ││
│  │  - 24/7 monitoring loop (every 5 min)                        ││
│  │  - Reads repo, CI, on-chain stats, API logs                  ││
│  │  - Calls Grok to triage and decide                           ││
│  │  - Notifies you on real signal (push/email)                  ││
│  │  - Approval gate before any write action                     ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Files

```
ops/
├── prompts/
│   └── flashrouter-operator.md       # The system prompt Grok runs with
├── agent/
│   ├── server-agent.py               # Long-running ops loop (server side)
│   ├── tools.py                      # Tool registry (read repo, run CI, etc.)
│   ├── approval.py                   # Approval-gated action wrapper
│   ├── audit_log.py                  # Append-only audit log of every action
│   └── requirements.txt
├── voice/
│   ├── voice_client.py               # Mic → Whisper → Grok → 11Labs loop
│   ├── push_to_talk.py               # Hotkey-driven alternative
│   └── requirements.txt
├── setup/
│   ├── windows-setup.ps1             # Install xAI CLI + deps on Windows 11
│   ├── server-setup.sh               # Install agent as systemd on Linux
│   ├── flashrouter-agent.service     # systemd unit file
│   └── mcp-config.json               # MCP server config for the CLI
├── scripts/
│   ├── health-check.sh               # Quick "is everything alive" check
│   ├── rotate-key.sh                 # Rotate XAI_API_KEY across machines
│   └── killswitch.sh                 # Emergency stop for the agent
├── config/
│   ├── allowed-actions.yml           # Whitelist of what the agent may do unattended
│   └── approval-required.yml         # Actions that need human approval
├── logs/
│   └── .gitkeep                      # Audit logs land here (gitignored)
└── README.md                         # This file
```

## What Grok can do

Three permission tiers, configured per environment.

### Tier 1 — Read-only ops monitor (default, always-on server)

- Read the repo, branches, PRs, issues, commits
- Read CI workflow status and logs
- Query on-chain stats (contract liveness, fee revenue, loan volume)
- Read API health, error rates, latency
- Send notifications when something changes
- Answer your voice / chat questions

### Tier 2 — Code assistant with PR power (local, you supervise)

Everything in Tier 1, plus:

- Create branches
- Write code via Foundry / npm
- Run tests locally
- Open PRs against `main` (never auto-merge)
- Comment on issues

### Tier 3 — Full DevOps autonomy (production server, approval-gated)

Everything in Tiers 1 + 2, plus:

- Deploy contracts to **testnet** (Sepolia, Base Sepolia, etc.)
- Restart API service via systemd
- Run database migrations
- Update environment variables
- Cancel / reschedule cron jobs

**Hard limits even at Tier 3:**

- ❌ Never deploys to mainnet without explicit human approval per deploy
- ❌ Never merges to `main`
- ❌ Never moves funds out of any wallet
- ❌ Never disables the killswitch on the FlashRouter contract
- ❌ Never updates the asset whitelist on the FlashRouter contract
- ❌ Never modifies multisig membership

## Key handling — read this before anything else

The xAI API key is read from the `XAI_API_KEY` environment variable. **Never** hardcoded, never committed.

### Setup on Windows 11 (your local box)

```powershell
# One time
[System.Environment]::SetEnvironmentVariable("XAI_API_KEY", "xai-yournewkey", "User")
# Then close + reopen any terminals
```

### Setup on the Linux server

```bash
# /etc/flashrouter-agent.env  (chmod 600, root:root)
XAI_API_KEY=xai-yournewkey
GITHUB_TOKEN=ghp_yourtoken
ELEVENLABS_API_KEY=el_yourkey   # only on the voice client box
```

### Rotation

When a key is exposed, leaked, or just on its quarterly rotation schedule:

```bash
bash ops/scripts/rotate-key.sh
```

The script walks you through revoking on console.x.ai, generating a new one, and updating env vars on every machine + restarting services.

## Quick start

### 1. Get a fresh xAI API key

If you've ever pasted a key anywhere it shouldn't be (chat, Slack, GitHub), revoke it now at [console.x.ai/team/default/api-keys](https://console.x.ai/team/default/api-keys) and generate a new one.

### 2. Local install (Windows 11)

Open PowerShell as your user (not Admin), then:

```powershell
cd C:\path\to\flashrouter\ops\setup
.\windows-setup.ps1
```

This installs the xAI CLI, sets your env var (you'll be prompted to paste the key), installs Python deps, and writes the MCP config.

### 3. Server install (Linux VPS)

SSH to the server, clone the repo, then:

```bash
cd flashrouter/ops/setup
sudo bash server-setup.sh
```

This installs the agent as a systemd service, sets up the env file, and starts the monitoring loop.

### 4. Voice mode

```powershell
# Windows
cd flashrouter\ops\voice
python voice_client.py
```

Hit `Space` to talk, release to send. Grok responds via ElevenLabs voice.

### 5. Verify

```bash
bash ops/scripts/health-check.sh
```

You should see green for: API key valid, GitHub auth ok, Foundry installed, agent service running.

## Safety model

| Risk | Control |
|---|---|
| Leaked API key | Env vars only, never in code. Rotation script. Audit log shows when key last loaded. |
| Grok writes bad code | All code lands in a PR, never merged automatically. Required reviewer = you. |
| Grok runs a destructive command | Whitelist of allowed commands per tier. Anything not on the whitelist requires approval. |
| Grok loops infinitely on a broken state | Per-action timeout. Per-hour action quota. Killswitch stops the agent immediately. |
| Mainnet deploys | Hardcoded refusal in the prompt + the agent. Mainnet RPC URLs are not even in the agent's env. |
| Cost runaway | Per-day xAI token budget. Agent halts and notifies when 80% consumed. |
| Audit trail | Every tool call, every Grok response, every approval is appended to `logs/audit.jsonl`. |

## Cost expectations

| Component | Monthly cost | Notes |
|---|---|---|
| xAI Grok 4 API | $50–$200 | Depends on how often you talk to it; budgeted in agent config |
| ElevenLabs voice | $11–$22 | Starter or Creator tier covers daily voice use |
| Whisper (local) | $0 | Runs on your CPU/GPU, free |
| Linux VPS | $5–$20 | Hetzner CX22, DigitalOcean basic, etc. |
| Domain (already bought) | $50/yr | flashrouter.io |
| **Total** | **$70–$250/mo** | All-in, fully autonomous DevOps + voice |

## What's next after setup

- Switch the FlashRouter standup briefing (the cron we set up earlier) to use Grok as the summarizer
- Add a GitHub Action that runs Grok on every PR to review
- Wire the voice client to your AirPods / desk mic
- Add Discord / Slack relay so Grok can post status updates
- Hook into the on-chain indexer once contracts are deployed

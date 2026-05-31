# FlashRouter Ops — Deployment Guide

End-to-end setup for the Grok-powered ops layer. Three machines, one shared brain.

## Pre-flight checklist

- [ ] xAI account with a Grok API key (fresh — if you've ever pasted one in chat, revoke and regenerate at [console.x.ai](https://console.x.ai/team/default/api-keys))
- [ ] GitHub PAT with `repo` + `workflow` + `read:packages` scopes
- [ ] ElevenLabs account (optional, only for voice) — [elevenlabs.io](https://elevenlabs.io)
- [ ] Linux VPS for the always-on agent — Hetzner CX22 ($5/mo), DigitalOcean basic ($6/mo), or similar
- [ ] Windows 11 box with Python 3.11+ and PowerShell 5+

## Step 1 — Local Windows setup (your daily driver)

```powershell
cd C:\path\to\flashrouter\ops\setup
.\windows-setup.ps1
```

Walks you through:
1. Installing the xAI CLI via the official PowerShell installer
2. Securely capturing `XAI_API_KEY`, `GITHUB_TOKEN`, `ELEVENLABS_API_KEY`, `CLOUDFLARE_API_TOKEN` into Windows user env vars (never echoed back, never written to a file)
3. Installing Python deps for the voice client
4. Installing ffmpeg via winget (needed for MP3 decode from ElevenLabs)
5. Writing MCP config to `%USERPROFILE%\.grok\mcp.json`
6. Smoke testing the xAI API

After the script finishes, **open a new PowerShell window** so env vars load.

### Verify the local install

```powershell
# Should print account info
curl.exe https://api.x.ai/v1/models -H "Authorization: Bearer $env:XAI_API_KEY" | ConvertFrom-Json | Select -Expand data | Select id

# Run the voice client
cd ..\voice
python voice_client.py
```

Hold `SPACE` to talk, release to send. Grok responds via ElevenLabs voice.

## Step 2 — Server setup (the always-on monitor)

SSH to your Linux VPS:

```bash
git clone https://github.com/FTHTrading/flashrouter.git
cd flashrouter/ops/setup
sudo bash server-setup.sh
```

The script:
1. Installs `git`, `gh`, `forge`, `cast`, `python3-venv`
2. Creates a dedicated `flashrouter-agent` user (won't touch other users)
3. Clones the repo into `/var/lib/flashrouter-agent/flashrouter`
4. Creates a Python venv and installs agent deps
5. Creates `/etc/flashrouter-agent.env` (mode 600, root-owned) as the secrets file
6. Installs and enables the `flashrouter-agent.service` systemd unit (hardened: `NoNewPrivileges`, `ProtectSystem=strict`, `PrivateTmp`, `MemoryMax=1G`, `CPUQuota=80%`)

### Add your secrets to the server

```bash
sudo nano /etc/flashrouter-agent.env
```

Set at minimum:
```bash
XAI_API_KEY=xai-...
GITHUB_TOKEN=ghp_...
AGENT_TIER=1            # start at 1 (read-only); promote later
DAILY_BUDGET_USD=5
```

Save, then start:

```bash
sudo systemctl start flashrouter-agent
sudo systemctl status flashrouter-agent
journalctl -u flashrouter-agent -f
```

You should see `[agent] starting at tier 1, polling every 300s`.

### Authenticate gh as the agent

```bash
sudo -u flashrouter-agent gh auth login
# Follow prompts — use the GITHUB_TOKEN you set in the env file
```

## Step 3 — Smoke test the whole stack

```bash
# From your Windows box OR the server
bash ops/scripts/health-check.sh
```

You want to see green on:
- `XAI_API_KEY set`
- `GITHUB_TOKEN set`
- `gh`, `forge`, `cast` on PATH
- `xAI API responds`
- `GitHub API responds`
- `systemd service active` (server only)

## Step 4 — Tier promotion

Start at Tier 1 (read-only) for the first 48 hours. Watch the audit log:

```bash
sudo tail -f /var/lib/flashrouter-agent/flashrouter/ops/logs/audit.jsonl
```

If you're comfortable with what the agent is doing, promote:

```bash
sudo sed -i 's/^AGENT_TIER=1$/AGENT_TIER=2/' /etc/flashrouter-agent.env
sudo systemctl restart flashrouter-agent
```

Tier 3 (full DevOps) — only after you've watched Tier 2 for a week and you have approval workflows wired:

```bash
sudo sed -i 's/^AGENT_TIER=2$/AGENT_TIER=3/' /etc/flashrouter-agent.env
sudo systemctl restart flashrouter-agent
```

## Step 5 — Voice client (optional, on Windows)

```powershell
cd C:\path\to\flashrouter\ops\voice
python voice_client.py
```

Hotkeys:
- `SPACE` (hold) — push-to-talk
- `M` — mute (Grok still thinks, just doesn't speak)
- `R` — replay last response
- `Q` — quit

If ElevenLabs is slow or you want offline-only:

```powershell
$env:USE_LOCAL_TTS = "true"
python voice_client.py
```

Falls back to pyttsx3 (Windows SAPI voices). Lower quality, zero cost, zero latency.

## Step 6 — Wire the existing standup briefing to Grok (optional)

The weekday 8 AM standup cron we scheduled earlier currently uses a generic summarizer. You can swap it to Grok by editing the cron's task in [perplexity.ai/computer/tasks/a8200743](https://www.perplexity.ai/computer/tasks/a8200743) and pointing the summarization step at `https://api.x.ai/v1/chat/completions` with your `XAI_API_KEY`.

## Operations

### Daily

- Read the standup briefing email at 8 AM ET
- Glance at `journalctl -u flashrouter-agent -n 50` if anything looks off
- Check `ops/logs/pending-approvals/` if the agent paged you

### Weekly

- Review `ops/logs/audit.jsonl` for anything unexpected
- Check xAI usage at [console.x.ai/team/default/usage](https://console.x.ai/team/default/usage)
- `bash ops/scripts/health-check.sh` on both machines

### Quarterly

- Rotate every API key: `bash ops/scripts/rotate-key.sh`
- Audit the `allowed-actions.yml` and `approval-required.yml` against any new operations you've added
- Review the GitHub PAT scopes — narrow if possible

## Emergency procedures

### Stop everything immediately

```bash
sudo bash ops/scripts/killswitch.sh
```

This:
- Stops the systemd service
- Disables auto-restart at boot
- Marks all pending approvals as denied
- Writes a `KILLSWITCH` marker the agent checks on next start

Resume with: `sudo bash ops/scripts/killswitch.sh release`

### Suspect a key leak

1. **Immediately revoke** at the provider:
   - xAI: [console.x.ai](https://console.x.ai/team/default/api-keys)
   - GitHub: [github.com/settings/tokens](https://github.com/settings/tokens)
   - ElevenLabs: [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
   - Cloudflare: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Generate a fresh key** with minimum scope
3. **Run the rotation script**: `bash ops/scripts/rotate-key.sh`
4. **Audit GitHub commits** for any time the leaked key may have been committed: `git log --all -p -S "leakedkeysuffix"`
5. **Check usage logs** for any unauthorized API calls during the exposure window

### Bill spike

```bash
# Halt the agent, investigate
sudo bash ops/scripts/killswitch.sh

# Look at what it was doing
tail -200 /var/lib/flashrouter-agent/flashrouter/ops/logs/audit.jsonl | jq

# Check xAI usage
curl https://api.x.ai/v1/usage -H "Authorization: Bearer $XAI_API_KEY"
```

If the agent was looping on a broken state, fix the underlying issue, then release: `sudo bash ops/scripts/killswitch.sh release`.

## Costs and budgets

| Resource | Typical monthly | Hard cap (configured) |
|---|---|---|
| xAI Grok API | $50–$200 | `DAILY_BUDGET_USD=5` ($150/mo) |
| ElevenLabs Starter | $11 | hard tier limit |
| Linux VPS | $5–$20 | n/a |
| **Total** | **$66–$231/mo** | |

If `DAILY_BUDGET_USD` is hit, the agent halts and writes a `budget_halt` audit record. It auto-resumes at UTC midnight.

## Hardening checklist

Before going to Tier 3:

- [ ] 2FA on xAI, GitHub, ElevenLabs, Cloudflare accounts (hardware key, not SMS)
- [ ] `gh auth status` shows the agent's PAT scoped to only `FTHTrading/flashrouter`
- [ ] `XAI_API_KEY` scoped to a project that has no payment method attached to your main account
- [ ] Server SSH on a non-default port, key auth only, no password auth
- [ ] `ufw` enabled, only port 22 (or your custom SSH port) open
- [ ] `unattended-upgrades` installed on the server
- [ ] systemd service runs as `flashrouter-agent` (not root)
- [ ] `/etc/flashrouter-agent.env` is mode 600 root:root
- [ ] Killswitch script tested at least once

## Troubleshooting

### "XAI_API_KEY not set"

The env var didn't load. On Windows, open a fresh PowerShell. On Linux, ensure `/etc/flashrouter-agent.env` has `XAI_API_KEY=xai-...` (no quotes, no spaces around `=`).

### "401 Unauthorized" from xAI

Key revoked, expired, or wrong. Generate a new one and run `bash ops/scripts/rotate-key.sh`.

### Voice client says "missing dependencies"

```powershell
pip install -r ops/voice/requirements.txt
```

Or just the missing ones the error listed.

### Agent runs but never does anything

It might be at Tier 1 with nothing changing. Check `journalctl -u flashrouter-agent -n 100` — look for `cycle_complete` entries. If you see those but no actions, that's correct behavior.

### Approval pending forever

Approval timeout is 10 minutes by default. The agent moves on (denies) after that. To approve in time, set up a notification webhook (`NOTIFY_WEBHOOK_URL` in the env file pointing at ntfy, Slack, or Discord).

/**
 * FlashRouter API staging stub — health + quote only.
 * Full Fastify API requires Postgres/Redis (see docker-compose.yml).
 */

interface Env {
  ENVIRONMENT?: string;
}

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  bnb: 56,
  polygon: 137,
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function signQuote(body: {
  chain: string;
  asset: string;
  amount: string;
  provider?: number;
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  return {
    provider: body.provider ?? 2,
    chainId: CHAIN_IDS[body.chain] ?? 0,
    asset: body.asset,
    amount: body.amount,
    providerFee: "0",
    platformFee: ((BigInt(body.amount) * 2n) / 10_000n).toString(),
    estimatedGas: "350000",
    estimatedGasUsd: "1.20",
    totalCostUsd: "1.20",
    expiresAt,
    signature: "0x" + "00".repeat(65),
    quoteHash: "0x" + "00".repeat(32),
    simulationUrl: null,
    staging: true,
    note: "Stub quote — connect to full API for signed production quotes.",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (path === "/v1/health" && request.method === "GET") {
      return json({
        status: "ok",
        version: "0.1.0-stub",
        environment: env.ENVIRONMENT ?? "staging",
        timestamp: new Date().toISOString(),
        services: { postgres: "not_connected", redis: "not_connected" },
        powerClients: "Flash wallets live on Base (Aave V3) for qualified clients — contact for custom deployment.",
      });
    }

    if (path === "/v1/quote" && request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      const b = body as Record<string, unknown>;
      const chain = b.chain as string | undefined;
      const asset = b.asset as string | undefined;
      const amount = b.amount as string | undefined;

      const validChains = Object.keys(CHAIN_IDS);
      if (!chain || !validChains.includes(chain)) {
        return json({ error: "Invalid chain", valid: validChains }, 400);
      }
      if (!asset || !/^0x[a-fA-F0-9]{40}$/.test(asset)) {
        return json({ error: "Invalid asset address" }, 400);
      }
      if (!amount || !/^\d+$/.test(amount)) {
        return json({ error: "Invalid amount (wei string required)" }, 400);
      }

      const provider =
        b.provider !== undefined ? Number(b.provider) : undefined;
      if (provider !== undefined && (provider < 0 || provider > 4 || !Number.isInteger(provider))) {
        return json({ error: "Invalid provider (0-4)" }, 400);
      }

      return json(signQuote({ chain, asset, amount, provider }));
    }

    if (path === "/" && request.method === "GET") {
      return json({
        name: "FlashRouter API",
        version: "0.1.0-stub",
        docs: "https://github.com/FTHTrading/flashrouter/tree/main/api",
        endpoints: ["GET /v1/health", "POST /v1/quote", "GET /mcp", "POST /mcp/invoke"],
        note: "Power client flash wallets (custom Aave V3 Base receivers) live now — see https://flashrouter.io for onboarding. Full API coming. MCP tools: flash_create_power_wallet, flash_build_and_deploy_strategy, run_railgun_shielded_flash, deal_issue_spv_with_all_zk, search_best_deals, verify_xrp_payment, close_power_client.",
      });
    }

    // MCP agentic (stub version for hub integration + public discovery)
    if (path === "/mcp" && request.method === "GET") {
      return json({
        tools: [
          { name: "flash_create_power_wallet", description: "Register isolated FlashWallet for power client (Base Aave V3)." },
          { name: "flash_build_and_deploy_strategy", description: "Build basic_arb or liq_hunter into executeOperation (Aerodrome etc)." },
          { name: "run_railgun_shielded_flash", description: "Shielded private flash via Railgun (1-2wk path)." },
          { name: "deal_issue_spv_with_all_zk", description: "Issue McKinzey/Weild SPV gated by 4 legacy-vault ZK proofs." },
          { name: "search_best_deals", description: "Zoniqx/RealT/Lofty/McKinzey/Weild + FlashRouter liquidity." },
          { name: "verify_xrp_payment", description: "Verify $1.2617 tx 8E263217... 20 XRP $29.42 PoF sample." },
          { name: "close_power_client", description: "Full orchestrate + billing + ZK + XRP evidence." }
        ],
        count: 7,
        note: "Stub (for discovery). Full impl in api/src/mcp.ts drives real closer ps1 with strategy injection + baseSepolia support. POST /mcp/invoke {tool,input} e.g. close_power_client with network/strategySnippet."
      });
    }
    if (path === "/mcp/invoke" && request.method === "POST") {
      let body: any = {};
      try { body = await request.json(); } catch {}
      const tool = body.tool || "";
      const input = body.input || {};
      // Minimal stub responses (real logic in full api/src/mcp.ts)
      if (tool === "verify_xrp_payment") {
        return json({ ok: true, tool, tx: "8E26321733467C94A1A4291381AA06EA737ACA0EDBF66F6738606B7779DE4F38", amount: "20 XRP ≈ $29.42 @ $1.2617", match: input.txHash === "8E26321733467C94A1A4291381AA06EA737ACA0EDBF66F6738606B7779DE4F38" ? "CONFIRMED canonical PoF" : "check hash", evidence: "Full dump + 13 authoritative files in flash-system/XRP_TREASURY_POF_EVIDENCE.md (Railgun flash capital, McKinzey EMD, DealSPV ZK, troptions PoF)" });
      }
      if (tool === "search_best_deals") {
        return json({ ok: true, tool, deals: ["Zoniqx (large SPV)", "McKinzey Lake Lanier $2.298M 1.91ac EMD $50k", "Weild Capital Formation OS", "RealT/Lofty yields"], flash: "FlashRouter best EMD rates" });
      }
      return json({ ok: true, tool, input, note: "Stub response. Deploy full api for real invoke + DealSPV ZK + Railgun + power close orchestration. See api/src/mcp.ts + flash-system/ + deals/contracts/." });
    }

    return json({ error: "Not found", path }, 404);
  },
};

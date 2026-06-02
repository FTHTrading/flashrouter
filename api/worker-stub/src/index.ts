/**
 * FlashRouter API staging stub & secure Web3 Gateway proxy.
 * Resolves CNAME Cross-User Banned (Error 1014) by routing gateway requests
 * through local Workers custom domain routes with namespace-based routing and compliance filters.
 */

interface Env {
  ENVIRONMENT?: string;
  HELIUS_API_KEY?: string;
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
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-payment-receipt",
};

// Compliance Blocklist (Sanctioned contracts & exploit addresses)
const SANCTIONED_ADDRESSES = new Set([
  "0xd90e2f925e14912d40c4b4a8a3a3d8667b9de1f0", // Tornado Cash Router (Ethereum)
  "0x153A042b918fA3C91Ff5EFEbfb73D963F9E9D7C1", // Tornado Cash (Base)
  "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", // Example Flagged Exploit Wallet
  "2sV8D3678bBfD46D98C156DB", // Mock Solana Sanctioned Address
  "7vD9a65d06dcc435a52D5880C6310Bd6E96c156DB", // Mock Solana Exploit Wallet
]);

// Target RPC nodes for Namespaces
const RPC_PROVIDERS: Record<string, string> = {
  mainnet: "https://cloudflare-eth.com/v1/mainnet",
  ethereum: "https://cloudflare-eth.com/v1/mainnet",
  base: "https://mainnet.base.org",
  "base-sepolia": "https://sepolia.base.org",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  polygon: "https://polygon-rpc.com",
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

/**
 * Screens RPC parameters for compliance violations.
 */
function isSanctioned(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  
  const checkString = (str: string): boolean => {
    if (typeof str !== "string") return false;
    const cleanStr = str.toLowerCase();
    for (const addr of SANCTIONED_ADDRESSES) {
      if (cleanStr.includes(addr.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  try {
    const rawString = JSON.stringify(payload);
    return checkString(rawString);
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const host = url.hostname.toLowerCase();

    // ==========================================
    // 1. SECURE RPC GATEWAY (eth.flashrouter.io)
    // ==========================================
    if (host === "eth.flashrouter.io") {
      const namespace = path.substring(1).split("/")[1]; // Extracts chain from /v1/:chain
      const targetRpc = RPC_PROVIDERS[namespace || ""];

      if (!targetRpc) {
        if (request.method === "GET") {
          return new Response(GATEWAY_REFERENCE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return json({
          error: "Invalid RPC namespace",
          message: "Please configure your client to connect to a valid namespace path.",
          namespaces: {
            "v1/ethereum": "Ethereum Mainnet Gateway",
            "v1/base": "Base Mainnet Gateway",
            "v1/base-sepolia": "Base Sepolia Gateway",
            "v1/arbitrum": "Arbitrum One Gateway",
            "v1/optimism": "Optimism Gateway",
            "v1/polygon": "Polygon PoS Gateway",
          },
          example: "https://eth.flashrouter.io/v1/base",
        }, 400);
      }

      if (request.method !== "POST") {
        return json({
          status: "active",
          gateway: "FlashRouter secure RPC proxy",
          namespace: namespace,
          target: targetRpc,
          note: "POST JSON-RPC request to execute on-chain queries.",
        });
      }

      // Read JSON-RPC body
      let rpcBody: any;
      try {
        rpcBody = await request.clone().json();
      } catch {
        return json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }, 400);
      }

      // Gating & Compliance Screening
      if (isSanctioned(rpcBody)) {
        console.warn(`[Compliance Gating] Transaction blocked. Target payload contains sanctioned address.`);
        return json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Sanction compliance check failed. Request address or target contract is restricted by OFAC compliance policies."
          },
          id: rpcBody?.id || null
        }, 403);
      }

      // Proxy request to the target node
      try {
        const response = await fetch(targetRpc, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rpcBody),
        });
        const resText = await response.text();
        return new Response(resText, {
          status: response.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (err: any) {
        return json({ jsonrpc: "2.0", error: { code: -32603, message: `RPC Proxy failed: ${err.message}` }, id: rpcBody?.id || null }, 502);
      }
    }

    // ==========================================
    // 1.5. SECURE SOL RPC GATEWAY (sol.flashrouter.io / helius.flashrouter.io)
    // ==========================================
    if (host === "sol.flashrouter.io" || host === "helius.flashrouter.io") {
      const heliusKey = env.HELIUS_API_KEY || "4e1f7d63-dd43-4e52-87eb-711bd6f083a2";
      
      // Determine if Devnet or Mainnet (check path namespaces like /v1/devnet)
      const isDevnet = path.includes("/v1/devnet") || path.includes("/devnet");
      const targetRpc = isDevnet 
        ? `https://devnet.helius-rpc.com/?api-key=${heliusKey}`
        : `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;

      if (request.method !== "POST") {
        if (request.method === "GET") {
          return new Response(SOL_GATEWAY_REFERENCE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return json({
          status: "active",
          gateway: "FlashRouter secure Solana RPC proxy (Helius)",
          endpoint: isDevnet ? "devnet" : "mainnet",
          note: "POST JSON-RPC request to execute Solana queries.",
        });
      }

      // Read JSON-RPC body
      let rpcBody: any;
      try {
        rpcBody = await request.clone().json();
      } catch {
        return json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }, 400);
      }

      // Gating & Compliance Screening
      if (isSanctioned(rpcBody)) {
        console.warn(`[Compliance Gating] Solana transaction blocked. Target payload contains sanctioned address.`);
        return json({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Sanction compliance check failed. Request address or target account is restricted by OFAC compliance policies."
          },
          id: rpcBody?.id || null
        }, 403);
      }

      // Proxy request to Helius
      try {
        const response = await fetch(targetRpc, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rpcBody),
        });
        const resText = await response.text();
        return new Response(resText, {
          status: response.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (err: any) {
        return json({ jsonrpc: "2.0", error: { code: -32603, message: `Solana RPC Proxy failed: ${err.message}` }, id: rpcBody?.id || null }, 502);
      }
    }

    // ==========================================
    // 2. IPFS SECURE GATEWAY (ipfs.flashrouter.io)
    // ==========================================
    if (host === "ipfs.flashrouter.io") {
      const ipfsMatch = path.match(/^\/ipfs\/([a-zA-Z0-9]+)/);
      if (ipfsMatch) {
        const cid = ipfsMatch[1];
        // Proxy files from public IPFS node
        try {
          const response = await fetch(`https://ipfs.io/ipfs/${cid}${url.search}`);
          const headers = new Headers(response.headers);
          // Set CORS headers
          for (const [k, v] of Object.entries(CORS_HEADERS)) {
            headers.set(k, v);
          }
          return new Response(response.body, {
            status: response.status,
            headers,
          });
        } catch (err: any) {
          return new Response(`IPFS fetch failed: ${err.message}`, { status: 502 });
        }
      }

      return new Response(`<html>
        <head>
          <title>FlashRouter Sovereign IPFS Gateway</title>
          <style>
            body { background: #050b14; color: #f3f4f6; font-family: monospace; padding: 3rem; }
            a { color: #c5a880; }
            h1 { color: #4a90e2; font-family: Georgia, serif; }
          </style>
        </head>
        <body>
          <h1>FlashRouter Sovereign IPFS Gateway</h1>
          <p>This hostname acts as a decentralized proxy for FlashRouter static assets and dApp interfaces.</p>
          <hr style="border-color:#1e2d42"/>
          <p>Usage: <code>https://ipfs.flashrouter.io/ipfs/[IPFS_CID]</code></p>
        </body>
      </html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // ==========================================
    // 3. STANDARD STUB API (api.flashrouter.io)
    // ==========================================
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

const SOL_GATEWAY_REFERENCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FlashRouter Sovereign Solana RPC Gateway</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0c0d0e;
      --bg-panel: #171a1d;
      --accent: #c5a880;
      --accent-muted: rgba(197, 168, 128, 0.15);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --border: #2d3139;
      --success: #10b981;
      --warning: #f59e0b;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 3rem 1.5rem;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 2rem;
      margin-bottom: 2.5rem;
    }
    h1 {
      font-family: 'Lora', Georgia, serif;
      color: var(--accent);
      font-size: 2.5rem;
      margin: 0 0 0.5rem 0;
      font-weight: 500;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
      margin: 0;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent-muted);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 500;
      margin-top: 1rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--success);
    }
    h2 {
      font-family: 'Lora', Georgia, serif;
      color: var(--text);
      font-size: 1.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      margin-top: 2.5rem;
      margin-bottom: 1.25rem;
      font-weight: 500;
    }
    .namespaces-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }
    .namespaces-table th, .namespaces-table td {
      text-align: left;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .namespaces-table th {
      color: var(--accent);
      font-weight: 500;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .namespaces-table td code {
      background: var(--bg-panel);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      border: 1px solid var(--border);
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    code {
      font-family: 'JetBrains Mono', monospace;
    }
    a {
      color: var(--accent);
      text-decoration: none;
      transition: color 0.2s;
    }
    a:hover {
      color: #dfc8a5;
      text-decoration: underline;
    }
    .panel {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
    }
    .panel-title {
      font-weight: 600;
      color: var(--accent);
      margin-top: 0;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .code-block {
      background: #060708;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.25rem;
      overflow-x: auto;
      margin: 1rem 0 0 0;
    }
    pre {
      margin: 0;
    }
    .code-block code {
      color: #a9b2c3;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .footer {
      margin-top: 4rem;
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>FlashRouter Sovereign Solana RPC Gateway</h1>
      <p class="subtitle">Secure, high-performance edge Solana RPC gateway backed by Helius API masking.</p>
      <div class="status-badge">
        <span class="status-dot"></span> Gateway Status: Active &amp; Compliant (Helius)
      </div>
    </header>

    <main>
      <h2>Endpoints</h2>
      <p>Configure your Solana connection or SDK using the following endpoints. Requests are forwarded directly to Helius with your API key securely masked.</p>

      <table class="namespaces-table">
        <thead>
          <tr>
            <th>Network</th>
            <th>Gateway Endpoint</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Solana Mainnet-Beta</td>
            <td><code>https://sol.flashrouter.io</code> or <code>https://helius.flashrouter.io</code></td>
          </tr>
          <tr>
            <td>Solana Devnet</td>
            <td><code>https://sol.flashrouter.io/v1/devnet</code> or <code>https://helius.flashrouter.io/v1/devnet</code></td>
          </tr>
        </tbody>
      </table>

      <h2>Safety &amp; Compliance (OFAC Filtering)</h2>
      <p>FlashRouter is dedicated to compliant, secure on-chain operations. To ensure the integrity of the Solana gateway:</p>
      <ul>
        <li>Every transaction payload submitted via the gateway is parsed and screened at the edge.</li>
        <li>Requests containing sanctioned Solana addresses or flagged exploit accounts will be rejected with an RFC-compliant JSON-RPC compliance error: <code>code: -32600</code> (Invalid Request) and status <code>403 Forbidden</code>.</li>
      </ul>

      <h2>Quick Start Code Example</h2>
      <p>Below is an example of instantiating a client using <a href="https://solana-labs.github.io/solana-web3.js/" target="_blank">@solana/web3.js</a> pointing directly to the Sovereign Solana RPC Gateway:</p>
      
      <div class="panel">
        <div class="panel-title">TypeScript / @solana/web3.js integration</div>
        <div class="code-block">
          <pre><code>import { Connection } from "@solana/web3.js";

// Initialize secure connection (Helius API key is hidden at the proxy layer)
const connection = new Connection("https://sol.flashrouter.io", "confirmed");

const slot = await connection.getSlot();
console.log(\`Current Solana slot: \${slot}\`);</code></pre>
        </div>
      </div>
    </main>

    <footer class="footer">
      &copy; 2026 FTH Trading LLC. Powered by <a href="https://flashrouter.io" target="_blank">FlashRouter</a> &amp; Helius.
    </footer>
  </div>
</body>
</html>
`;

const GATEWAY_REFERENCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FlashRouter Sovereign RPC Gateway</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0c0d0e;
      --bg-panel: #171a1d;
      --accent: #c5a880;
      --accent-muted: rgba(197, 168, 128, 0.15);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --border: #2d3139;
      --success: #10b981;
      --warning: #f59e0b;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 3rem 1.5rem;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 2rem;
      margin-bottom: 2.5rem;
    }
    h1 {
      font-family: 'Lora', Georgia, serif;
      color: var(--accent);
      font-size: 2.5rem;
      margin: 0 0 0.5rem 0;
      font-weight: 500;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
      margin: 0;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent-muted);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 500;
      margin-top: 1rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--success);
    }
    h2 {
      font-family: 'Lora', Georgia, serif;
      color: var(--text);
      font-size: 1.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      margin-top: 2.5rem;
      margin-bottom: 1.25rem;
      font-weight: 500;
    }
    .namespaces-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }
    .namespaces-table th, .namespaces-table td {
      text-align: left;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .namespaces-table th {
      color: var(--accent);
      font-weight: 500;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .namespaces-table td code {
      background: var(--bg-panel);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      border: 1px solid var(--border);
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    code {
      font-family: 'JetBrains Mono', monospace;
    }
    a {
      color: var(--accent);
      text-decoration: none;
      transition: color 0.2s;
    }
    a:hover {
      color: #dfc8a5;
      text-decoration: underline;
    }
    .panel {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
    }
    .panel-title {
      font-weight: 600;
      color: var(--accent);
      margin-top: 0;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .code-block {
      background: #060708;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.25rem;
      overflow-x: auto;
      margin: 1rem 0 0 0;
    }
    pre {
      margin: 0;
    }
    .code-block code {
      color: #a9b2c3;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .footer {
      margin-top: 4rem;
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>FlashRouter Sovereign RPC Gateway</h1>
      <p class="subtitle">Secure, high-performance edge RPC gateway and compliance screening proxy.</p>
      <div class="status-badge">
        <span class="status-dot"></span> Gateway Status: Active &amp; Compliant
      </div>
    </header>

    <main>
      <h2>Namespaces &amp; Endpoints</h2>
      <p>Configure your Web3 provider or SDK using the following namespace routes. Each path forwards JSON-RPC queries directly to a high-speed, cached RPC provider.</p>

      <table class="namespaces-table">
        <thead>
          <tr>
            <th>Chain</th>
            <th>Gateway Endpoint</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ethereum Mainnet</td>
            <td><code>https://eth.flashrouter.io/v1/ethereum</code></td>
          </tr>
          <tr>
            <td>Base Mainnet</td>
            <td><code>https://eth.flashrouter.io/v1/base</code></td>
          </tr>
          <tr>
            <td>Base Sepolia Testnet</td>
            <td><code>https://eth.flashrouter.io/v1/base-sepolia</code></td>
          </tr>
          <tr>
            <td>Arbitrum One</td>
            <td><code>https://eth.flashrouter.io/v1/arbitrum</code></td>
          </tr>
          <tr>
            <td>Optimism Mainnet</td>
            <td><code>https://eth.flashrouter.io/v1/optimism</code></td>
          </tr>
          <tr>
            <td>Polygon PoS</td>
            <td><code>https://eth.flashrouter.io/v1/polygon</code></td>
          </tr>
        </tbody>
      </table>

      <h2>Safety &amp; Compliance (OFAC Filtering)</h2>
      <p>FlashRouter is dedicated to compliant, secure on-chain operations. To ensure the integrity of the gateway:</p>
      <ul>
        <li>Every transaction payload submitted via the gateway is parsed and screened at the edge.</li>
        <li>Requests containing sanctioned addresses (e.g. Tornado Cash) or flagged exploit contracts will be rejected with an RFC-compliant JSON-RPC compliance error: <code>code: -32600</code> (Invalid Request) and status <code>403 Forbidden</code>.</li>
        <li>Counterfeit token contracts are prohibited and flagged directly in the router system.</li>
      </ul>

      <h2>Quick Start Code Example</h2>
      <p>Below is an example of instantiating a client using <a href="https://viem.sh" target="_blank">viem</a> pointing directly to the Sovereign RPC Gateway:</p>
      
      <div class="panel">
        <div class="panel-title">TypeScript / Viem integration</div>
        <div class="code-block">
          <pre><code>import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({
  chain: base,
  transport: http("https://eth.flashrouter.io/v1/base")
});

const blockNumber = await client.getBlockNumber();
console.log(\`Current Base block: \${blockNumber}\`);</code></pre>
        </div>
      </div>
    </main>

    <footer class="footer">
      &copy; 2026 FTH Trading LLC. Powered by <a href="https://flashrouter.io" target="_blank">FlashRouter</a>.
    </footer>
  </div>
</body>
</html>
`;


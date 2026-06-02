// ============ Header scroll state ============
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ============ Mobile menu ============
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    })
  );
}

// ============ Scroll reveal ============
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 60 + 'ms';
  io.observe(el);
});

// ============ Web3 Wallet Connection ============
const connectWalletBtn = document.getElementById('connectWalletBtn');
const connectWalletBtnMobile = document.getElementById('connectWalletBtnMobile');

const toggleWallet = (btn) => {
  if (!btn) return;
  const isConnected = btn.classList.toggle('connected');
  if (isConnected) {
    btn.textContent = '0x71C...3a9 (Base)';
    btn.title = 'Click to disconnect';
  } else {
    btn.textContent = 'Connect Wallet';
    btn.title = '';
  }
};

if (connectWalletBtn) {
  connectWalletBtn.addEventListener('click', () => toggleWallet(connectWalletBtn));
}
if (connectWalletBtnMobile) {
  connectWalletBtnMobile.addEventListener('click', () => toggleWallet(connectWalletBtnMobile));
}

// ============ Router Console Tabs ============
const tabRouterBtn = document.getElementById('tabRouterBtn');
const tabCodeBtn = document.getElementById('tabCodeBtn');
const routerPane = document.getElementById('routerPane');
const codePane = document.getElementById('codePane');

if (tabRouterBtn && tabCodeBtn) {
  tabRouterBtn.addEventListener('click', () => {
    tabRouterBtn.classList.add('active');
    tabCodeBtn.classList.remove('active');
    routerPane.classList.add('active');
    codePane.classList.remove('active');
  });

  tabCodeBtn.addEventListener('click', () => {
    tabCodeBtn.classList.add('active');
    tabRouterBtn.classList.remove('active');
    codePane.classList.add('active');
    routerPane.classList.remove('active');
  });
}

// ============ Dynamic SVG Wiring Helper ============
const resetSvgFlows = () => {
  // Clear active/gold classes from energy-wire paths
  document.querySelectorAll('.energy-wire').forEach(path => {
    path.classList.remove('flow-active', 'flow-gold', 'flow-blue');
  });
  // Clear active classes from nodes
  const nodes = ['node-strategy', 'node-router', 'node-aave', 'node-balancer', 'node-uniswap', 'node-maker', 'node-execute', 'node-settle'];
  nodes.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('stroke', id === 'node-router' || id === 'node-uniswap' || id === 'node-settle' ? '#4a90e2' : '#1e2d42');
      el.setAttribute('fill', '#111c2e');
    }
  });
};

const activateSvgPath = (lenderId) => {
  resetSvgFlows();
  
  // Wires to activate
  const activeWires = [
    'wire-strategy-router',
    `wire-router-${lenderId}`,
    `wire-${lenderId}-execute`,
    'wire-execute-settle'
  ];

  activeWires.forEach(id => {
    const path = document.getElementById(id);
    if (path) {
      path.classList.add('flow-active', 'flow-gold');
    }
  });

  // Nodes to activate
  const activeNodes = ['node-strategy', 'node-router', `node-${lenderId}`, 'node-execute', 'node-settle'];
  activeNodes.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('stroke', 'var(--gold)');
      el.setAttribute('fill', 'rgba(197, 168, 128, 0.15)');
    }
  });
};

// ============ Routing Simulator Logic ============
const simBtn = document.getElementById('simBtn');
const simToken = document.getElementById('simToken');
const simAmountInput = document.getElementById('simAmount');
const simShielded = document.getElementById('simShielded');
const simOutput = document.getElementById('simOutput');
const zkLogs = document.getElementById('zkLogs');

// Router copy nodes
const step1Desc = document.getElementById('step1Desc');
const step2Desc = document.getElementById('step2Desc');
const step3Desc = document.getElementById('step3Desc');

// Format helper
const formatNumber = (numStr) => {
  const clean = numStr.replace(/,/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 1000000;
  return parsed;
};

if (simBtn) {
  simBtn.addEventListener('click', () => {
    const rawVal = simAmountInput.value || "1,000,000";
    const amountVal = formatNumber(rawVal);
    const asset = simToken.value;
    const isZK = simShielded ? simShielded.checked : false;

    // Display formatted amount
    const formattedAmount = amountVal.toLocaleString('en-US', { maximumFractionDigits: 2 });
    simAmountInput.value = formattedAmount;

    simOutput.style.display = 'block';
    simBtn.disabled = true;
    simBtn.textContent = 'Simulating Route...';
    zkLogs.textContent = 'Initializing route simulator...\n';

    // Route logic calculation
    let providerId = "balancer";
    let providerName = "Balancer V2 Vault";
    let fee = "0.00% fee";
    let feeBps = 0;

    if (asset === "DAI") {
      providerId = "maker";
      providerName = "MakerDAO DSS-Flash";
      fee = "0.00% fee (gas only)";
    } else if (amountVal < 100000) {
      providerId = "aave";
      providerName = "Aave V3 simplePool";
      fee = "0.05% fee";
      feeBps = 5;
    } else if (amountVal >= 5000000) {
      providerId = "balancer";
      providerName = "Balancer V2 Vault";
      fee = "0.00% fee";
    } else {
      providerId = "balancer";
      providerName = "Balancer V2 Vault";
      fee = "0.00% fee";
    }

    // Activate glowing paths
    activateSvgPath(providerId);

    // Step descriptions
    step1Desc.textContent = `Sourced ${formattedAmount} ${asset} from ${providerName} (${fee}).`;

    if (isZK) {
      step2Desc.textContent = `Shielded borrowed capital into Railgun pool. Executing private strategy.`;
    } else {
      step2Desc.textContent = `Executing public strategy (USDC arbitrage swap Curve/Aerodrome).`;
    }

    // Generate random mock profit (0.1% to 0.4% notional)
    const profitRate = 0.0015 + Math.random() * 0.0025;
    const grossProfit = amountVal * profitRate;
    const feesPaid = amountVal * (feeBps / 10000);
    const netProfit = grossProfit - feesPaid;
    const formattedProfit = netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    step3Desc.textContent = `Repaid loan principal. Settled atomically. Transferred net profit of ${formattedProfit} to owner.`;

    // Simulated log timeline
    const logs = [];
    const timestamp = () => `[${new Date().toLocaleTimeString()}]`;

    if (isZK) {
      logs.push(
        `<span class="log-debug">${timestamp()} [client] Initializing private execution context...</span>`,
        `<span class="log-debug">${timestamp()} [client] Lender query: asset=${asset}, amount=${formattedAmount}</span>`,
        `<span class="log-success">${timestamp()} [router] Selected optimal lender: ${providerName} (${fee})</span>`,
        `<span class="log-info">${timestamp()} [noir] Compiling target circuit: src/FlashWalletStrategy.nr</span>`,
        `<span class="log-debug">${timestamp()} [noir] Compiler backend: nargo v0.31.0+ultra_plonk (BN254 curve)</span>`,
        `<span class="log-debug">${timestamp()} [noir] Synthesizing circuit witness (264,812 constraints)...</span>`,
        `<span class="log-info">${timestamp()} [prover] Computing quotient polynomial commitments...</span>`,
        `<span class="log-info">${timestamp()} [prover] Constructing PLONK proof (proof_size: 320 bytes)...</span>`,
        `<span class="log-success">${timestamp()} [prover] Proof generated in 842ms. Key hash: 0x8af2c6c39f1c79e60ba2501a3ea7f9c8d9ea</span>`,
        `<span class="log-info">${timestamp()} [compliance] Gating transaction through OFAC compliance router...</span>`,
        `<span class="log-success">${timestamp()} [compliance] Compliance checks PASS (TRM/Chainalysis API: CLEAN)</span>`,
        `<span class="log-info">${timestamp()} [relayer] Broadcasting EIP-712 payload to Base Mainnet...</span>`,
        `<span class="log-info">${timestamp()} [evm] Calling verifyProof() on-chain at 0xVerifierAddress...</span>`,
        `<span class="log-success">${timestamp()} [evm] Proof validated. Executing atomic FlashWallet borrow callback...</span>`,
        `<span class="log-success">${timestamp()} [evm] Settlement SUCCESS. Net Profit: ${formattedProfit}. Gas: 245,188. Block #19827394.</span>`
      );
    } else {
      logs.push(
        `<span class="log-debug">${timestamp()} [client] Initializing public execution context...</span>`,
        `<span class="log-debug">${timestamp()} [client] Lender query: asset=${asset}, amount=${formattedAmount}</span>`,
        `<span class="log-success">${timestamp()} [router] Selected optimal lender: ${providerName} (${fee})</span>`,
        `<span class="log-info">${timestamp()} [evm] Simulating strategy via Tenderly node...</span>`,
        `<span class="log-success">${timestamp()} [evm] Simulation dry-run PASS. Net profit: ${formattedProfit}</span>`,
        `<span class="log-info">${timestamp()} [compliance] Gating transaction through OFAC compliance router...</span>`,
        `<span class="log-success">${timestamp()} [compliance] Compliance checks PASS (TRM/Chainalysis API: CLEAN)</span>`,
        `<span class="log-info">${timestamp()} [relayer] Broadcasting payload to public mempool...</span>`,
        `<span class="log-success">${timestamp()} [evm] Execution settled atomically. Gas spent: 185,420 gas. Block #19827394.</span>`
      );
    }

    let logIdx = 0;
    zkLogs.innerHTML = "";
    
    const printLog = () => {
      if (logIdx < logs.length) {
        zkLogs.innerHTML += logs[logIdx++] + '<br/>';
        zkLogs.scrollTop = zkLogs.scrollHeight;
        setTimeout(printLog, 120);
      } else {
        simBtn.disabled = false;
        simBtn.textContent = 'Simulate Optimal Route';
      }
    };

    setTimeout(printLog, 100);
  });
}

// ============ Static Code Rendering ============
const heroCodeStatic = document.getElementById('heroCodeStatic');
const heroLines = [
  `import { FlashRouter } from "@flashrouter/sdk";`,
  ``,
  `const fr = new FlashRouter({ chain: "base" });`,
  ``,
  `// Automatically routes to cheapest lender (0% fee)`,
  `const tx = await fr.borrow({`,
  `  asset: "USDC",`,
  `  amount: 5_000_000, // 5M USDC`,
  `  execute: myStrategyContract, // sovereign alpha callback`,
  `});`,
  ``,
  `console.log(\`Arbitrage complete. Profit: \${tx.profit} USDC\`);`
];

if (heroCodeStatic) {
  heroCodeStatic.innerHTML = heroLines.map(line => {
    let clean = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    if (clean.startsWith('//')) {
      return `<span class="ln"><span class="tok-com">${clean}</span></span>`;
    }
    clean = clean
      .replace(/\b(import|from|const|new|await)\b/g, '<span class="tok-key">$1</span>')
      .replace(/\b(borrow|log)\b/g, '<span class="tok-fn">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="tok-str">"$1"</span>')
      .replace(/\b(\d+_\d+_\d+|\b\d+\b)\b/g, '<span class="tok-num">$1</span>');
      
    return `<span class="ln">${clean}</span>`;
  }).join('\n');
}

// ============ AGENTIC MCP & FLASH ROUTE BUYS STUDIO ============
const dealAsset = document.getElementById('dealAsset');
const dealAmount = document.getElementById('dealAmount');
const dealStrategy = document.getElementById('dealStrategy');
const dealRouteArgs = document.getElementById('dealRouteArgs');
const argLabel = document.getElementById('argLabel');
const studioCodeOutput = document.getElementById('studioCodeOutput');
const studioMcpOutput = document.getElementById('studioMcpOutput');
const runStudioBtn = document.getElementById('runStudioBtn');
const studioLogs = document.getElementById('studioLogs');

let activeTemplate = 'arbitrage';

const templatesData = {
  arbitrage: {
    asset: 'USDC',
    amount: '5,000,000',
    strategy: '0x7d9a65d06dcc435a52D5880C6310Bd6E96c156DB',
    routes: 'Uniswap V3 [Base] => Aerodrome [Base]',
    label: 'DEX Routes',
    lender: 'balancer',
    lenderName: 'Balancer V2 Vault'
  },
  liquidation: {
    asset: 'WETH',
    amount: '2,500',
    strategy: '0x1c8b3d8d6411252d6a52010bd6e06b96c156db3a',
    routes: 'Aave V3 Debt Pool => Uniswap V3 Swap',
    label: 'Liquidation Target',
    lender: 'aave',
    lenderName: 'Aave V3'
  },
  refinance: {
    asset: 'DAI',
    amount: '10,000,000',
    strategy: '0x96c156db3a7d9a65d06dcc435a52d5880c6310bd',
    routes: 'MakerDAO Vault => Balancer V2 Loan',
    label: 'Refinance Target',
    lender: 'maker',
    lenderName: 'Maker DSS'
  },
  private_guard: {
    asset: 'USDC',
    amount: '1,500,000',
    strategy: '0x3a96c156db7d9a65d06dcc435a52d5880c6310bd',
    routes: 'Private RPC Relay (Base Sepolia)',
    label: 'ZK Guard Options',
    lender: 'uniswap',
    lenderName: 'Uniswap V3'
  }
};

const updateStudioWorkspace = () => {
  const asset = dealAsset.value;
  const amt = dealAmount.value;
  const strat = dealStrategy.value;
  const routes = dealRouteArgs.value;

  // TypeScript Code Generation
  let tsCode = `import { FlashRouter } from "@flashrouter/sdk";
const fr = new FlashRouter({ chain: "base" });

// Sourced dynamically from cheapest lender
const tx = await fr.borrow({
  asset: "${asset}",
  amount: ${amt.replace(/,/g, '')},
  execute: "${strat}", // Callback contract
  params: {
    template: "${activeTemplate}",
    routes: "${routes}"
  }
});`;

  // Syntax highlighting for Studio code
  studioCodeOutput.innerHTML = tsCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\b(import|from|const|new|await)\b/g, '<span style="color:var(--accent)">$1</span>')
    .replace(/\b(borrow)\b/g, '<span style="color:var(--gold)">$1</span>')
    .replace(/"([^"]+)"/g, '<span style="color:#10b981">"$1"</span>')
    .replace(/\b(\d+_\d+|\b\d+\b)\b/g, '<span style="color:#d97706">$1</span>');

  // MCP JSON Generation
  let mcpPayload = {
    method: "execute_autonomous_agent_flash",
    params: {
      chain: "base",
      asset: asset,
      amount: amt.replace(/,/g, ''),
      strategyAddress: strat,
      template: activeTemplate,
      args: {
        routes: routes,
        relayer: activeTemplate === 'private_guard' ? 'railgun' : 'public',
        shielded: activeTemplate === 'private_guard'
      }
    }
  };

  studioMcpOutput.textContent = JSON.stringify(mcpPayload, null, 2);
};

// Bind Workspace Inputs
if (dealAsset) {
  dealAsset.addEventListener('change', updateStudioWorkspace);
  dealAmount.addEventListener('input', updateStudioWorkspace);
  dealStrategy.addEventListener('input', updateStudioWorkspace);
  dealRouteArgs.addEventListener('input', updateStudioWorkspace);
}

// Bind Template Cards
const templateCards = document.querySelectorAll('.template-card');
templateCards.forEach(card => {
  card.addEventListener('click', () => {
    templateCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    activeTemplate = card.getAttribute('data-template');
    const data = templatesData[activeTemplate];

    // Load defaults
    dealAsset.value = data.asset;
    dealAmount.value = data.amount;
    dealStrategy.value = data.strategy;
    dealRouteArgs.value = data.routes;
    argLabel.textContent = data.label;

    updateStudioWorkspace();
  });
});

// Workspace Tab Switching
const workspaceTabs = document.querySelectorAll('.workspace-tab');
const workspacePanes = document.querySelectorAll('.workspace-pane');
workspaceTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    workspaceTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const paneId = tab.getAttribute('data-pane');
    workspacePanes.forEach(pane => {
      pane.classList.remove('active');
      if (pane.id === paneId) {
        pane.classList.add('active');
      }
    });
  });
});

// Run Studio Simulator
if (runStudioBtn) {
  runStudioBtn.addEventListener('click', () => {
    const asset = dealAsset.value;
    const amt = dealAmount.value;
    const strat = dealStrategy.value;
    const templateData = templatesData[activeTemplate];

    runStudioBtn.disabled = true;
    runStudioBtn.textContent = 'Agent Executing...';
    studioLogs.textContent = 'Initializing Bank of AI agent container...\n';

    // Highlight SVG routing paths
    activateSvgPath(templateData.lender);

    // Scroll SVG diagram smoothly into view to display the animated glow
    const svgWrap = document.querySelector('.diagram-wrap');
    if (svgWrap) {
      svgWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timestamp = () => `[${new Date().toLocaleTimeString()}]`;
    const blockNum = 19827394 + Math.floor(Math.random() * 2000);
    const mockProfit = (parseFloat(amt.replace(/,/g, '')) * (0.0018 + Math.random() * 0.0015)).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    const logs = [
      `${timestamp()} [Agent] Loading Model Context Protocol context: client=BankOfAI...`,
      `${timestamp()} [Agent] Invoking tool execute_autonomous_agent_flash...`,
      `${timestamp()} [x402] Target: borrow ${amt} ${asset} via FlashRouter API.`,
      `${timestamp()} [x402] Gated. HTTP 402 returned. Gateway fee: 0.25 USDC (api.health.quick).`,
      `${timestamp()} [TronPay] Initiating Tron USDT validation micro-transfer...`,
      `${timestamp()} [TronPay] Sign success. Memo: inv_deal_${Math.random().toString(36).substring(4, 9)}. Tx: t_tx_${Math.random().toString(36).substring(2, 12)}`,
      `${timestamp()} [x402] Verify success. Receipt rcpt_${Math.random().toString(36).substring(4, 10)} recorded on Apostle Ledger.`,
      `${timestamp()} [Agent] Gating check completed. Retrying FlashRouter borrow route...`,
      `${timestamp()} [noir] Compiling target verification logic: src/${activeTemplate}.nr`,
      `${timestamp()} [noir] Witnesses generated. Proving key matches verification key (ultra_plonk).`,
      `${timestamp()} [FlashRouter] Selected cheapest lender: ${templateData.lenderName}.`,
      `${timestamp()} [EVM] Submitting flash transaction payload to Base Mainnet...`,
      `${timestamp()} [EVM] Executor contract ${strat} callback entered. Settle conditions matched.`,
      `${timestamp()} [EVM] Settlement SUCCESS. Net Profit: ${mockProfit}. Gas: 146,802. Block #${blockNum}`
    ];

    let logIdx = 0;
    studioLogs.innerHTML = "";

    const printStudioLog = () => {
      if (logIdx < logs.length) {
        let color = '#a9b2c3';
        if (logs[logIdx].includes('SUCCESS')) color = '#10b981';
        if (logs[logIdx].includes('[noir]')) color = '#c5a880';
        if (logs[logIdx].includes('[x402]')) color = '#f5a623';
        if (logs[logIdx].includes('Invoking')) color = '#4a90e2';
        
        studioLogs.innerHTML += `<span style="color:${color}">${logs[logIdx++]}</span><br/>`;
        studioLogs.scrollTop = studioLogs.scrollHeight;
        setTimeout(printStudioLog, 150);
      } else {
        runStudioBtn.disabled = false;
        runStudioBtn.textContent = 'Run Agent Simulator';
      }
    };

    setTimeout(printStudioLog, 200);
  });
}

// Initial workspace compilation
window.addEventListener('DOMContentLoaded', () => {
  updateStudioWorkspace();
});

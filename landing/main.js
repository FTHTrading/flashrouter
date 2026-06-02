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
    let provider = "Balancer V2 Vault";
    let fee = "0.00% fee";
    let feeBps = 0;

    if (asset === "DAI") {
      // Maker is cheapest for DAI
      provider = "MakerDAO DSS-Flash";
      fee = "0.00% fee (gas only)";
    } else if (amountVal < 100000) {
      // Smaller loans go Aave V3 due to lower execution overhead
      provider = "Aave V3 simplePool";
      fee = "0.05% fee";
      feeBps = 5;
    } else if (amountVal >= 5000000) {
      // Very large pools use Balancer/Uniswap hybrid
      provider = "Balancer V2 Vault";
      fee = "0.00% fee";
    } else {
      // Mid range standard optimal is Balancer
      provider = "Balancer V2 Vault";
      fee = "0.00% fee";
    }

    // Step descriptions
    step1Desc.textContent = `Sourced ${formattedAmount} ${asset} from ${provider} (${fee}).`;

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
        `<span class="log-success">${timestamp()} [router] Selected optimal lender: ${provider} (${fee})</span>`,
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
        `<span class="log-success">${timestamp()} [router] Selected optimal lender: ${provider} (${fee})</span>`,
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
    // Basic syntax highlighter helper
    let clean = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Replace comments
    if (clean.startsWith('//')) {
      return `<span class="ln"><span class="tok-com">${clean}</span></span>`;
    }
    // Highlight keywords
    clean = clean
      .replace(/\b(import|from|const|new|await)\b/g, '<span class="tok-key">$1</span>')
      .replace(/\b(borrow|log)\b/g, '<span class="tok-fn">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="tok-str">"$1"</span>')
      .replace(/\b(\d+_\d+_\d+|\b\d+\b)\b/g, '<span class="tok-num">$1</span>');
      
    return `<span class="ln">${clean}</span>`;
  }).join('\n');
}


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
  document.querySelectorAll('.energy-wire').forEach(path => {
    path.classList.remove('flow-active', 'flow-gold', 'flow-blue');
  });
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
  const activeNodes = ['node-strategy', 'node-router', `node-${lenderId}`, 'node-execute', 'node-settle'];
  activeNodes.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('stroke', 'var(--gold)');
      el.setAttribute('fill', 'rgba(197, 168, 128, 0.15)');
    }
  });
};

// ============ Syntax Highlighter Helper ============
const highlightTypeScript = (code) => {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\b(import|from|const|new|await)\b/g, '<span style="color:var(--accent)">$1</span>')
    .replace(/\b(borrow|flashLoan|log)\b/g, '<span style="color:var(--gold)">$1</span>')
    .replace(/"([^"]+)"/g, '<span style="color:#10b981">"$1"</span>')
    .replace(/\b(\d+_\d+|\b\d+\b)\b/g, '<span style="color:#d97706">$1</span>');
};

const highlightSolidity = (code) => {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\b(pragma|solidity|import|contract|is|constructor|function|external|override|returns|uint256|address|bool|require|return|bytes|calldata|memory|private|constant|public|uint)\b/g, '<span style="color:var(--accent)">$1</span>')
    .replace(/\b(executeOperation|receiveFlashLoan|uniswapV3FlashCallback|onFlashLoan|approve|transfer|ADDRESSES_PROVIDER|getPool)\b/g, '<span style="color:var(--gold)">$1</span>')
    .replace(/("([^"]+)"|'([^']+)')/g, '<span style="color:#10b981">$1</span>')
    .replace(/(\/\/.*)/g, '<span style="color:var(--text-faint)">$1</span>');
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

    const formattedAmount = amountVal.toLocaleString('en-US', { maximumFractionDigits: 2 });
    simAmountInput.value = formattedAmount;

    simOutput.style.display = 'block';
    simBtn.disabled = true;
    simBtn.textContent = 'Simulating Route...';
    zkLogs.textContent = 'Initializing route simulator...\n';

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
    } else {
      providerId = "balancer";
      providerName = "Balancer V2 Vault";
      fee = "0.00% fee";
    }

    // Step descriptions
    step1Desc.textContent = `Sourced ${formattedAmount} ${asset} from ${providerName} (${fee}).`;

    if (isZK) {
      step2Desc.textContent = `Shielded borrowed capital into Railgun pool. Executing private strategy.`;
    } else {
      step2Desc.textContent = `Executing public strategy (USDC arbitrage swap Curve/Aerodrome).`;
    }

    const profitRate = 0.0015 + Math.random() * 0.0025;
    const grossProfit = amountVal * profitRate;
    const feesPaid = amountVal * (feeBps / 10000);
    const netProfit = grossProfit - feesPaid;
    const formattedProfit = netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    step3Desc.textContent = `Repaid loan principal. Settled atomically. Transferred net profit of ${formattedProfit} to owner.`;

    const logs = [];
    const timestamp = () => `[${new Date().toLocaleTimeString()}]`;

    // 1. Sourcing logs
    logs.push(
      `<span class="log-debug">${timestamp()} [client] Initializing execution context...</span>`,
      `<span class="log-debug">${timestamp()} [client] Sourcing available liquidity for ${formattedAmount} ${asset}...</span>`,
      `<span class="log-info">${timestamp()} [router] - Aave V3 pool reserves: $145.2M | Fee: 0.05%</span>`,
      `<span class="log-info">${timestamp()} [router] - Balancer V2 Vault: $84.1M | Fee: 0.00%</span>`,
      `<span class="log-info">${timestamp()} [router] - Uniswap V3 ticks: $4.9M | Fee: 0.30%</span>`,
      `<span class="log-info">${timestamp()} [router] - MakerDAO Flashmint: $500.0M | Fee: 0.00%</span>`
    );

    // 2. Decision Matrix evaluations
    if (asset === "DAI") {
      logs.push(
        `<span class="log-info">${timestamp()} [router] Decision Matrix: MakerDAO has lowest fee (0% fee, gas-only minting). Sourcing from MakerDAO.</span>`
      );
    } else if (amountVal < 100000) {
      logs.push(
        `<span class="log-info">${timestamp()} [router] Decision Matrix: Small borrow size (< $100k). Aave V3 chosen due to lowest gas overhead.</span>`
      );
    } else {
      logs.push(
        `<span class="log-info">${timestamp()} [router] Decision Matrix: Large borrow size. Balancer V2 Vault selected (0% fee, deep pool).</span>`
      );
    }

    logs.push(
      `<span class="log-success">${timestamp()} [router] Selected optimal lender: ${providerName} (${fee})</span>`
    );

    if (isZK) {
      logs.push(
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
        `<span class="log-info">${timestamp()} [evm] Simulating strategy via Tenderly node...</span>`,
        `<span class="log-success">${timestamp()} [evm] Simulation dry-run PASS. Net profit: ${formattedProfit}</span>`,
        `<span class="log-info">${timestamp()} [compliance] Gating transaction through OFAC compliance router...</span>`,
        `<span class="log-success">${timestamp()} [compliance] Compliance checks PASS (TRM/Chainalysis API: CLEAN)</span>`,
        `<span class="log-info">${timestamp()} [relayer] Broadcasting payload to public mempool...</span>`,
        `<span class="log-success">${timestamp()} [evm] Execution settled atomically. Gas spent: 185,420 gas. Block #19827394.</span>`
      );
    }

    // Activate glowing paths
    activateSvgPath(providerId);

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
const codeHeaderTitle = document.getElementById('codeHeaderTitle');

let activeTemplate = 'arbitrage';
let activeCodeTab = 'sdk';

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

const solidityTemplates = {
  'sol-aave': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFlashLoanSimpleReceiver} from "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AaveFlashLoanSimpleReceiver is IFlashLoanSimpleReceiver {
    IPoolAddressesProvider public override ADDRESSES_PROVIDER;
    
    constructor(address provider) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(provider);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // [1] Callback logic: Sourced borrowed capital
        // borrowed: amount of asset
        // fee: premium
        
        // [2] Execute your proprietary logic (arbitrage, refinance, etc.)
        
        // [3] Approve pool to repay debt (borrow + premium fee)
        uint256 amountToRepay = amount + premium;
        IERC20(asset).approve(address(ADDRESSES_PROVIDER.getPool()), amountToRepay);
        return true;
    }
}`,
  'sol-balancer': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFlashLoanRecipient} from "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
import {IVault} from "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BalancerFlashLoanRecipient is IFlashLoanRecipient {
    IVault private constant vault = IVault(0xBA12222222228d8Ba445958a75a0704d566A2Cff);

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory fees,
        bytes memory userData
    ) external override {
        require(msg.sender == address(vault), "Caller must be Balancer Vault");

        // [1] Callback logic: Sourced tokens[0] of amounts[0]
        // fee: fees[0]
        
        // [2] Execute strategy logic using borrowed funds
        
        // [3] Return borrow + fee back to Vault
        IERC20 token = tokens[0];
        uint256 amountToRepay = amounts[0] + fees[0];
        token.transfer(address(vault), amountToRepay);
    }
}`,
  'sol-uniswap': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUniswapV3FlashCallback} from "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV3FlashCallback is IUniswapV3FlashCallback {
    address public constant pool = 0x88e6A0c2dDDD26FEEb64F039a2c41296FCB3f564; // ETH/USDC pool

    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external override {
        require(msg.sender == pool, "Caller must be target Uniswap Pool");

        // [1] Sourced capital is already credited to this contract
        // fee: fee0 (for token0) or fee1 (for token1)
        
        // [2] Run trading strategy callback logic
        
        // [3] Transfer borrowed capital + fee back to the pool
        // IERC20(token).transfer(pool, amount + fee);
    }
}`,
  'sol-maker': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MakerFlashBorrower is IERC3156FlashBorrower {
    address public constant makerMinter = 0x60744434d5862828bbfebbbbf40212bb64f039a2c4;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        require(msg.sender == makerMinter, "Caller must be Maker Minter");
        require(token == DAI, "Only DAI borrows allowed");

        // [1] Sourced DAI (0% fee, gas only)
        // [2] Execute leverage/rebalance callback logic
        
        // [3] Approve Maker minter to pull back the DAI principal
        IERC20(DAI).approve(makerMinter, amount);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}`
};

const updateStudioWorkspace = () => {
  const asset = dealAsset.value;
  const amt = dealAmount.value;
  const strat = dealStrategy.value;
  const routes = dealRouteArgs.value;

  if (activeCodeTab === 'sdk') {
    codeHeaderTitle.querySelector('span').textContent = 'TypeScript SDK implementation snippet';
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

    studioCodeOutput.innerHTML = highlightTypeScript(tsCode);
  } else {
    // Solidity tab
    const titleMap = {
      'sol-aave': 'Solidity Aave V3 executeOperation() receiver callback',
      'sol-balancer': 'Solidity Balancer V2 receiveFlashLoan() recipient callback',
      'sol-uniswap': 'Solidity Uniswap V3 uniswapV3FlashCallback() receiver callback',
      'sol-maker': 'Solidity MakerDAO onFlashLoan() borrower callback'
    };
    codeHeaderTitle.querySelector('span').textContent = titleMap[activeCodeTab] || 'Solidity implementation contract';
    const rawSol = solidityTemplates[activeCodeTab] || '';
    studioCodeOutput.innerHTML = highlightSolidity(rawSol);
  }

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

// Code Sub-tab Switching
const codeSubtabs = document.querySelectorAll('.code-subtab');
codeSubtabs.forEach(subtab => {
  subtab.addEventListener('click', () => {
    codeSubtabs.forEach(t => t.classList.remove('active'));
    subtab.classList.add('active');
    activeCodeTab = subtab.getAttribute('data-subtab');
    updateStudioWorkspace();
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

    const svgWrap = document.querySelector('.diagram-wrap');
    if (svgWrap) {
      svgWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timestamp = () => `[${new Date().toLocaleTimeString()}]`;
    const blockNum = 19827394 + Math.floor(Math.random() * 2000);
    const mockProfit = (parseFloat(amt.replace(/,/g, '')) * (0.0018 + Math.random() * 0.0015)).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    // Build agent decision-making logs
    const logs = [
      `${timestamp()} [Agent] Loading Model Context Protocol context: client=BankOfAI...`,
      `${timestamp()} [Agent] Invoking tool execute_autonomous_agent_flash...`,
      `${timestamp()} [x402] Target: borrow ${amt} ${asset} via FlashRouter API.`,
      `${timestamp()} [x402] Gated. HTTP 402 returned. Gateway fee: 0.25 USDC (api.health.quick).`,
      `${timestamp()} [TronPay] Initiating Tron USDT validation micro-transfer...`,
      `${timestamp()} [TronPay] Sign success. Hash: t_tx_${Math.random().toString(36).substring(2, 12)}`,
      `${timestamp()} [x402] Verify success. Receipt rcpt_${Math.random().toString(36).substring(4, 10)} recorded on Apostle Ledger.`,
      `${timestamp()} [Agent] Gating check completed. Evaluating optimal flash lenders...`,
      `${timestamp()} [router] Querying all pool reserves for ${asset}:`,
      `${timestamp()} [router]  - Aave V3: $145.2M available | Fee: 0.05%`,
      `${timestamp()} [router]  - Balancer V2: $84.1M available | Fee: 0.00%`,
      `${timestamp()} [router]  - Uniswap V3: $4.9M available | Fee: 0.30%`,
      `${timestamp()} [router]  - MakerDAO DSS: $500.0M available | Fee: 0.00%`
    ];

    // Lender reasoning logs
    if (activeTemplate === 'refinance') {
      logs.push(
        `${timestamp()} [router] Decision Matrix: MakerDAO has lowest fee (0% fee, gas-only DAI minting). Selecting Maker DSS.`
      );
    } else if (activeTemplate === 'liquidation') {
      logs.push(
        `${timestamp()} [router] Decision Matrix: WETH borrow size of ${amt} requested. Aave V3 selected (optimal pool depth + gas efficiency).`
      );
    } else if (activeTemplate === 'private_guard') {
      logs.push(
        `${timestamp()} [router] Decision Matrix: Private relay shield requested. Routing to Uniswap V3 flash swap pool to bypass mempool detection.`
      );
    } else {
      logs.push(
        `${timestamp()} [router] Decision Matrix: Borrow size ${amt} ${asset} matches Balancer V2 Vault (0% fee, cheapest path).`
      );
    }

    logs.push(
      `${timestamp()} [router] Selected optimal lender: ${templateData.lenderName}.`,
      `${timestamp()} [noir] Compiling target verification logic: src/${activeTemplate}.nr`,
      `${timestamp()} [noir] Witnesses generated. Proving key matches verification key (ultra_plonk).`,
      `${timestamp()} [EVM] Submitting flash transaction payload to Base Mainnet...`,
      `${timestamp()} [EVM] Executor contract ${strat} callback entered. Settle conditions matched.`,
      `${timestamp()} [EVM] Settlement SUCCESS. Net Profit: ${mockProfit}. Gas: 146,802. Block #${blockNum}`
    );

    let logIdx = 0;
    studioLogs.innerHTML = "";

    const printStudioLog = () => {
      if (logIdx < logs.length) {
        let color = '#a9b2c3';
        if (logs[logIdx].includes('SUCCESS')) color = '#10b981';
        if (logs[logIdx].includes('[noir]')) color = '#c5a880';
        if (logs[logIdx].includes('[x402]')) color = '#f5a623';
        if (logs[logIdx].includes('Invoking')) color = '#4a90e2';
        if (logs[logIdx].includes('Decision Matrix')) color = '#c5a880';
        
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

// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * FlashWalletTemplate.sol
 * 
 * Per-power-client isolated flash loan receiver (Aave V3 Base primary).
 * 
 * **Power Client Flash Wallets – Live Tonight**
 * 
 * You write the alpha.  
 * We set up the wallet and close the deal.
 * 
 * - Isolated per-client smart contract (your own receiver)
 * - Deployed on Base (Aave V3)
 * - You control the `executeOperation()` logic
 * - Non-custodial. Sovereign. No shared infrastructure
 * - We handle deployment, verification, and initial testing
 * 
 * You want to hunt liquidations? Run arb? Do whatever the fuck you want. You write it, we ship the contract.
 * 
 * **Minimum:** $25k upfront or 20% profit share.
 * 
 * SETUP (done by us):
 * - Deploy one instance per qualified power client.
 * - Pass Aave V3 PoolAddressesProvider for Base: 0xe20fCBdBfFC4Dd138cE8b2e6FBb6CB49777ad64D
 * - Owner = client treasury / multisig.
 * - Whitelist in FlashRouter (if routing through main router) or call direct.
 *
 * YOU WRITE:
 * - The strategy inside executeOperation (arbitrage, liquidation, yield farming, etc.).
 * - Any additional adapters or logic.
 *
 * WE CLOSE:
 * - Deploy the contract.
 * - Fund gas if needed.
 * - Provide client the address + ABI.
 * - Onboard to private API / dashboard if applicable.
 *
 * Non-custodial: client controls the receiver. FlashRouter (if used) only provides optimal routing.
 * Isolated: one client per contract. No shared state.
 */

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

contract FlashWalletTemplate is FlashLoanSimpleReceiverBase {
    address public owner;

    event FlashLoanExecuted(address asset, uint256 amount, uint256 profit);

    constructor(address _addressProvider) 
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = msg.sender;
    }

    /**
     * Request a flash loan through this wallet (called by owner or authorized router).
     */
    function requestFlashLoan(address _asset, uint256 _amount) external {
        require(msg.sender == owner, "Only owner");
        
        POOL.flashLoanSimple(
            address(this),
            _asset,
            _amount,
            "",
            0
        );
    }

    /**
     * THE STRATEGY GOES HERE.
     * 
     * This is called by Aave after funds are sent to this contract.
     * Implement your logic (swap on DEX, arb, etc.), then approve repayment.
     * 
     * Example skeleton (uncomment and fill):
     * 
     * // 1. Decode params if needed
     * // (address target, bytes memory swapData) = abi.decode(params, (address, bytes));
     * 
     * // 2. Do the thing (e.g. swap USDC for ETH on Aerodrome/Uniswap, etc.)
     * // IERC20(asset).approve(target, amount);
     * // (bool ok, ) = target.call(swapData);
     * // require(ok, "strategy failed");
     * 
     * // 3. Ensure balance >= amount + premium at end
     * 
     * uint256 totalOwed = amount + premium;
     * IERC20(asset).approve(address(POOL), totalOwed);
     * 
     * emit FlashWalletExecuted(asset, amount, premium, initiator);
     * emit StrategyExecuted(params);
     * 
     * return true;
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        
        uint256 totalOwed = amount + premium;

        // ============================
        // YOUR STRATEGY GOES HERE
        // This is where the magic happens
        // ============================

        // Example: Just repay for testing
        IERC20(asset).approve(address(POOL), totalOwed);

        uint256 profit = 0; // Change this when you make money (arb, liq, etc.)
        emit FlashLoanExecuted(asset, amount, profit);

        return true;
    }

    /**
     * Owner-only withdraw (profits, residuals, etc.)
     */
    function withdraw(address _token) public {
        require(msg.sender == owner, "Not owner");
        uint256 bal = IERC20(_token).balanceOf(address(this));
        if (bal > 0) {
            IERC20(_token).transfer(owner, bal);
        }
    }

    // Allow receiving ETH/WETH if strategy involves it
    receive() external payable {}
}

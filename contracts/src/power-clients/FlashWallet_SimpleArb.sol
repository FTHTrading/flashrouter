// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * FlashWallet_SimpleArb.sol
 * 
 * Example power client flash wallet for simple cross-DEX arbitrage on Base.
 * 
 * TEMPLATE: Client fills the swap logic with their specific DEX calls, routes, and profit calc.
 * 
 * Flow:
 * - Flash borrow asset (e.g. USDC from Aave).
 * - Swap on DEX1 for another asset at better rate.
 * - Swap back on DEX2 for more of original asset.
 * - Repay flash + premium, keep profit.
 * 
 * You write the exact swap paths, amounts, and checks.
 * We deploy the isolated contract for your power client.
 */

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

contract FlashWallet_SimpleArb is FlashLoanSimpleReceiverBase {
    address payable public immutable owner;

    event ArbExecuted(address indexed asset, uint256 amount, uint256 profit);

    constructor(address _addressProvider) 
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = payable(msg.sender);
    }

    function requestFlashLoan(address _token, uint256 _amount, bytes calldata _params) public {
        require(msg.sender == owner, "Only owner");
        POOL.flashLoanSimple(address(this), _token, _amount, _params, 0);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // === YOUR ARB STRATEGY ===
        // Decode params if you pass DEX routes etc.
        // e.g. (address dex1, address dex2, address intermediate) = abi.decode(params, (address, address, address));
        //
        // 1. Approve and swap amount of asset on dex1 for intermediate asset.
        // IERC20(asset).approve(dex1, amount);
        // uint256 intermediateAmount = IUniswapRouter(dex1).swap(...);
        //
        // 2. Swap intermediate back to asset on dex2 for more than amount + premium.
        // IERC20(intermediate).approve(dex2, intermediateAmount);
        // uint256 finalAmount = IUniswapRouter(dex2).swap(...);
        //
        // 3. Require finalAmount >= amount + premium.
        // require(finalAmount >= amount + premium, "Arb failed");
        //
        // 4. Approve POOL.
        uint256 totalOwed = amount + premium;
        IERC20(asset).approve(address(POOL), totalOwed);

        // emit ArbExecuted(asset, amount, finalAmount - totalOwed);

        return true;
        // === END YOUR STRATEGY ===
    }

    function withdraw(address _token) public {
        require(msg.sender == owner, "Not owner");
        uint256 bal = IERC20(_token).balanceOf(address(this));
        if (bal > 0) IERC20(_token).transfer(owner, bal);
    }

    receive() external payable {}
}

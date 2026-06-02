// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * FlashWallet_ExamplePower.sol
 * 
 * Example filled power client flash wallet.
 * 
 * This is what we "write and close" for a client.
 * Client provides their alpha, we customize and deploy.
 * 
 * Example strategy: simple arb using mock calls (in real, replace with actual DEX router calls on Base).
 */

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

contract FlashWallet_ExamplePower is FlashLoanSimpleReceiverBase {
    address payable public immutable owner;

    event StrategyComplete(uint256 profit);

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
        // Example power client strategy (arb simulation):
        // In production, this would call real routers like Aerodrome or Uniswap on Base.
        // Assume params encodes target swap data.
        
        // Mock: "do something" with the funds to generate profit.
        // e.g. IERC20(asset).approve(someDex, amount);
        // (bool success, ) = someDex.call(swapData);
        // uint256 received = ... calculate from swap.

        uint256 totalOwed = amount + premium;
        
        // For demo, assume we have enough (in real, the swaps must yield more).
        // To make it "profitable", the client would ensure received > totalOwed.
        
        IERC20(asset).approve(address(POOL), totalOwed);

        // Emit for client dashboard.
        emit StrategyComplete(0); // replace with actual profit.

        return true;
    }

    function withdraw(address _token) public {
        require(msg.sender == owner, "Not owner");
        uint256 bal = IERC20(_token).balanceOf(address(this));
        if (bal > 0) IERC20(_token).transfer(owner, bal);
    }

    receive() external payable {}
}

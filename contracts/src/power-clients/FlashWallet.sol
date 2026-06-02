// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FlashWallet is FlashLoanSimpleReceiverBase {
    address public owner;

    event FlashLoanExecuted(address asset, uint256 amount, uint256 profit);

    constructor(address _addressProvider) 
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = msg.sender;
    }

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

        uint256 profit = 0; // Change this when you make money
        emit FlashLoanExecuted(asset, amount, profit);

        return true;
    }

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

    function withdraw(address _asset) external {
        require(msg.sender == owner, "Only owner");
        IERC20(_asset).transfer(owner, IERC20(_asset).balanceOf(address(this)));
    }
}

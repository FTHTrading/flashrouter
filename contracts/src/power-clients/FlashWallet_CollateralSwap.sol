// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * FlashWallet_CollateralSwap.sol
 * 
 * Example power client flash wallet for collateral swaps / refinancing.
 * 
 * TEMPLATE for client: customize the swap logic for their positions.
 * 
 * You borrow the new collateral asset, swap to repay old debt, seize/swap collateral.
 */

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

contract FlashWallet_CollateralSwap is FlashLoanSimpleReceiverBase {
    address payable public immutable owner;

    event CollateralSwapped(address indexed oldCollateral, address indexed newCollateral, uint256 profit);

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
        // === YOUR COLLATERAL SWAP STRATEGY ===
        // Decode params for old debt, new collateral, etc.
        // e.g. (address oldDebtAsset, uint256 debtAmount, address newCollateral) = ...
        //
        // 1. Use borrowed asset to repay old debt on Aave (or other).
        // 2. Receive old collateral.
        // 3. Swap old collateral to new collateral or to repay asset.
        // 4. Supply new collateral, borrow if needed.
        // 5. Repay flash.
        uint256 totalOwed = amount + premium;
        IERC20(asset).approve(address(POOL), totalOwed);

        // emit CollateralSwapped(...);

        return true;
        // === END ===
    }

    function withdraw(address _token) public {
        require(msg.sender == owner, "Not owner");
        uint256 bal = IERC20(_token).balanceOf(address(this));
        if (bal > 0) IERC20(_token).transfer(owner, bal);
    }

    receive() external payable {}
}

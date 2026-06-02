// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * FlashWallet_LiquidationHunter.sol
 * 
 * Example power client flash wallet for hunting liquidations on Base (Aave V3 primarily).
 * 
 * This is a TEMPLATE for a power client. Copy, rename, fill in your specific logic, and we deploy.
 * 
 * Strategy: 
 * - Flash borrow the repay asset (e.g. USDC).
 * - Use it to repay a borrower's undercollateralized debt.
 * - Seize the collateral (e.g. WETH).
 * - Swap collateral back to repay asset + profit.
 * - Repay flash loan.
 * 
 * You control the exact DEXes, slippage, etc. in executeOperation.
 * 
 * Minimums and terms as per agreement ($25k or 20% profit share).
 */

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

contract FlashWallet_LiquidationHunter is FlashLoanSimpleReceiverBase {
    address payable public immutable owner;

    // Example addresses on Base (update per client or mainnet)
    address public constant AAVE_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5; // Pool proxy
    // Add your liquidation target contracts, DEX routers etc. as constants or params.

    event LiquidationExecuted(address indexed debtAsset, uint256 amount, uint256 profit, address indexed borrower);

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
        // === CLIENT'S STRATEGY HERE ===
        // Example liquidation flow (pseudo-code, implement with actual calls):
        //
        // 1. Decode params for target borrower, collateral, etc.
        // (address borrower, address collateralAsset, uint256 debtToCover) = abi.decode(params, (address, address, uint256));
        //
        // 2. Call Aave's liquidationCall or equivalent on the lending pool.
        // POOL.liquidationCall(collateralAsset, asset, borrower, debtToCover, false);
        //
        // 3. Receive collateral in this contract.
        //
        // 4. Swap collateral to repay asset (use Uniswap/Aerodrome router).
        // e.g. swap collateral for asset to cover amount + premium + profit.
        //
        // 5. Approve POOL for repayment.
        uint256 totalOwed = amount + premium;
        IERC20(asset).approve(address(POOL), totalOwed);

        // Emit for tracking
        // emit LiquidationExecuted(asset, amount, /* profit calc */, borrower);

        // === END STRATEGY ===
        return true;
    }

    function withdraw(address _token) public {
        require(msg.sender == owner, "Not owner");
        uint256 bal = IERC20(_token).balanceOf(address(this));
        if (bal > 0) IERC20(_token).transfer(owner, bal);
    }

    receive() external payable {}
}

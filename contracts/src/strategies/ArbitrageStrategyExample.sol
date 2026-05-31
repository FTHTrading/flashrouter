// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IFlashStrategy} from "../interfaces/IFlashStrategy.sol";

interface IERC20Min {
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata) external returns (uint256);
}

/// @title ArbitrageStrategyExample
/// @notice Reference implementation showing how a user contract integrates
///         with FlashRouter to perform cross-DEX arbitrage in one tx.
/// @dev    THIS IS EXAMPLE CODE. Replace dex addresses and swap logic
///         for your actual strategy. MIT licensed — fork it.
contract ArbitrageStrategyExample is IFlashStrategy {
    address public immutable owner;
    address public immutable router; // FlashRouter address
    ISwapRouter public immutable dexA;
    ISwapRouter public immutable dexB;

    error OnlyRouter();
    error OnlyOwner();
    error NotProfitable();

    constructor(address _router, address _dexA, address _dexB) {
        owner = msg.sender;
        router = _router;
        dexA = ISwapRouter(_dexA);
        dexB = ISwapRouter(_dexB);
    }

    /// @notice FlashRouter callback. Borrowed amount of `asset` is sitting
    ///         in this contract. Use it. Leave (amount + totalFee) approved
    ///         for the router to pull back.
    function onFlashLoan(
        address asset,
        uint256 amount,
        uint256 totalFee,
        address initiator,
        bytes calldata data
    ) external override returns (bool) {
        if (msg.sender != router) revert OnlyRouter();
        if (initiator != owner) revert OnlyOwner();

        (address targetToken, uint24 feeA, uint24 feeB, uint256 minProfit) =
            abi.decode(data, (address, uint24, uint24, uint256));

        // Buy `targetToken` on dexA with the borrowed `asset`.
        IERC20Min(asset).approve(address(dexA), amount);
        uint256 boughtAmount = dexA.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: targetToken,
                fee: feeA,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: 1, // protect with off-chain quote in production
                sqrtPriceLimitX96: 0
            })
        );

        // Sell `targetToken` on dexB for `asset`.
        IERC20Min(targetToken).approve(address(dexB), boughtAmount);
        uint256 receivedAsset = dexB.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: targetToken,
                tokenOut: asset,
                fee: feeB,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: boughtAmount,
                amountOutMinimum: amount + totalFee + minProfit,
                sqrtPriceLimitX96: 0
            })
        );

        uint256 owed = amount + totalFee;
        if (receivedAsset < owed + minProfit) revert NotProfitable();

        // Approve router to pull repayment.
        IERC20Min(asset).approve(router, owed);

        // Send profit to the owner (initiator).
        uint256 profit = receivedAsset - owed;
        IERC20Min(asset).transfer(initiator, profit);

        return true;
    }

    /// @notice Owner can sweep stranded tokens if anything ever gets stuck.
    function sweep(address token) external {
        if (msg.sender != owner) revert OnlyOwner();
        uint256 bal = IERC20Min(token).balanceOf(address(this));
        if (bal > 0) IERC20Min(token).transfer(owner, bal);
    }
}

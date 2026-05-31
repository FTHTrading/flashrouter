// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

/// @title IFlashAdapter — Internal interface for provider adapters
/// @notice Every flash-loan provider (Aave, Balancer, Uniswap, Maker)
///         has its own adapter contract implementing this interface.
///         Adding a new provider = deploying a new adapter and
///         registering it with the FlashRouter.
interface IFlashAdapter {
    /// @notice Execute a flash loan from this provider.
    /// @dev    Called by FlashRouter only. Adapter is responsible for
    ///         calling the upstream provider, receiving funds, forwarding
    ///         to the strategy via FlashRouter, and ensuring repayment.
    /// @param  asset         Asset to borrow.
    /// @param  amount        Amount to borrow.
    /// @param  callbackData  ABI-encoded data the adapter needs to
    ///                       complete the flash loan (strategy address,
    ///                       initiator, user data, fee data, etc.)
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata callbackData
    ) external;

    /// @notice Quote the fee for a given flash loan.
    /// @dev    Pure / view function. Used by the off-chain quoter and
    ///         for on-chain accounting before execution.
    function flashFee(address asset, uint256 amount) external view returns (uint256);

    /// @notice Maximum flash loan amount this provider can supply for asset.
    function maxFlashLoan(address asset) external view returns (uint256);

    /// @notice Provider identifier (matches IFlashRouter.Provider enum value).
    function providerId() external pure returns (uint8);
}

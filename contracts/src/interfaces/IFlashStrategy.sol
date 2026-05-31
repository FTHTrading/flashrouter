// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

/// @title IFlashStrategy — Callback interface implemented by user contracts
/// @notice FlashRouter forwards control to your strategy contract during
///         a flash loan. Your job is to use the borrowed funds and leave
///         (amount + totalFee) on the FlashRouter before returning.
/// @dev    The router will pull the owed amount from your strategy via
///         transferFrom — so your strategy must approve the router for
///         the owed amount before returning, OR push the owed amount
///         directly to the router via transfer.
interface IFlashStrategy {
    /// @notice Called by FlashRouter during a flash loan execution.
    /// @param  asset         The borrowed asset.
    /// @param  amount        The borrowed amount.
    /// @param  totalFee      providerFee + platformFee. You must repay
    ///                       (amount + totalFee).
    /// @param  initiator     The address that called FlashRouter.flashLoan.
    /// @param  data          Opaque bytes you passed in strategyData.
    /// @return success       Must return true on success. Anything else
    ///                       (or revert) cancels the entire transaction.
    function onFlashLoan(
        address asset,
        uint256 amount,
        uint256 totalFee,
        address initiator,
        bytes calldata data
    ) external returns (bool success);
}

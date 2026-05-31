// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

/// @title IFlashRouter — Unified flash-loan router interface
/// @notice The single entry point a user calls to execute a flash loan
///         through any supported provider (Aave V3, Balancer V2,
///         Uniswap V3, MakerDAO DSS-Flash) on any supported EVM chain.
/// @dev    Non-custodial. The router never holds user funds between
///         transactions. Each flash loan settles atomically — if the
///         user's strategy fails to repay, the entire transaction
///         reverts and no state changes occur.
interface IFlashRouter {
    /// @notice The set of flash-loan providers FlashRouter can route to.
    /// @dev    AUTO lets the off-chain quoter pick the cheapest provider
    ///         for the requested asset/amount/chain at execution time.
    enum Provider {
        AUTO,
        AAVE_V3,
        BALANCER_V2,
        UNISWAP_V3,
        MAKER_DSS
    }

    /// @notice Emitted on every successful flash loan.
    /// @param  caller       The address that called flashLoan.
    /// @param  strategy     The user's strategy contract that received
    ///                      the borrowed funds and produced the repayment.
    /// @param  provider     The provider actually used to source the loan.
    /// @param  asset        The borrowed asset address.
    /// @param  amount       Amount borrowed (in asset's smallest unit).
    /// @param  providerFee  Fee paid to the upstream provider.
    /// @param  platformFee  Fee collected by FlashRouter (basis points
    ///                      of notional, sent to FeeCollector).
    /// @param  profit       Net asset profit returned to the caller after
    ///                      fees. Zero if the strategy was not profit-bearing.
    event FlashLoanExecuted(
        address indexed caller,
        address indexed strategy,
        Provider indexed provider,
        address asset,
        uint256 amount,
        uint256 providerFee,
        uint256 platformFee,
        uint256 profit
    );

    /// @notice Emitted when a quote is consumed (one quote = one execution
    ///         allowed; replay-protected via nonce).
    event QuoteConsumed(bytes32 indexed quoteHash, address indexed caller);

    /// @notice Thrown when the asset is not on the verified-issuer whitelist.
    /// @dev    This is the on-chain expression of FlashRouter's anti-fraud
    ///         posture. Counterfeit "USDT" or any token whose contract does
    ///         not match the canonical issuer is rejected at the router level.
    error AssetNotVerified(address asset);

    /// @notice Thrown when the chosen provider has insufficient liquidity.
    error InsufficientProviderLiquidity(Provider provider, uint256 requested, uint256 available);

    /// @notice Thrown when the user's strategy fails to repay principal + fee.
    error RepaymentFailed(uint256 owed, uint256 received);

    /// @notice Thrown when the platform fee would exceed the hard cap.
    error PlatformFeeTooHigh(uint16 requested, uint16 cap);

    /// @notice Thrown when a signed off-chain quote is invalid or expired.
    error InvalidQuote();

    /// @notice Thrown when paused.
    error Paused();

    /// @notice Parameters for a flash loan.
    /// @param  provider      Provider to use (AUTO = let the quoter pick).
    /// @param  asset         Asset to borrow.
    /// @param  amount        Amount to borrow.
    /// @param  strategy      Contract implementing IFlashStrategy.
    /// @param  strategyData  Opaque bytes forwarded to the strategy.
    /// @param  minProfit     Revert if net profit < minProfit.
    /// @param  quote         Optional signed off-chain quote (empty = no quote).
    struct FlashLoanParams {
        Provider provider;
        address asset;
        uint256 amount;
        address strategy;
        bytes strategyData;
        uint256 minProfit;
        bytes quote;
    }

    /// @notice Execute a flash loan.
    /// @dev    Reverts on any failure. Returns the net profit (in asset units)
    ///         credited to msg.sender. The strategy contract is responsible
    ///         for moving the borrowed funds, executing its logic, and
    ///         leaving (amount + providerFee + platformFee) on the router
    ///         by the end of its callback.
    function flashLoan(FlashLoanParams calldata params) external returns (uint256 profit);

    /// @notice View the current platform fee in basis points (1 bp = 0.01%).
    function platformFeeBps() external view returns (uint16);

    /// @notice View the hard-capped maximum platform fee in basis points.
    function MAX_PLATFORM_FEE_BPS() external view returns (uint16);

    /// @notice Check whether an asset is on the verified-issuer whitelist
    ///         for this chain.
    function isVerifiedAsset(address asset) external view returns (bool);
}

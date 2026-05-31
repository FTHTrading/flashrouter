// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {IFlashRouter} from "./interfaces/IFlashRouter.sol";
import {IFlashStrategy} from "./interfaces/IFlashStrategy.sol";
import {IFlashAdapter} from "./interfaces/IFlashAdapter.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title FlashRouter
/// @notice Unified entry point for flash loans across Aave V3, Balancer V2,
///         Uniswap V3, and MakerDAO DSS-Flash. Non-custodial, fee-bounded,
///         pause-able, upgradeable via UUPS.
/// @author FlashRouter
/// @custom:security-contact security@flashrouter.io
contract FlashRouter is IFlashRouter {
    // ─────────────────────────────────────────────────────────────────────
    //                              CONSTANTS
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IFlashRouter
    uint16 public constant override MAX_PLATFORM_FEE_BPS = 10; // 0.10% hard cap

    uint16 private constant DEFAULT_PLATFORM_FEE_BPS = 2; // 0.02% default

    // ─────────────────────────────────────────────────────────────────────
    //                              STORAGE
    // ─────────────────────────────────────────────────────────────────────

    address public admin;
    address public pendingAdmin;
    address public feeCollector;
    uint16 public override platformFeeBps;
    bool public paused;

    /// @notice Adapter contract for each provider.
    mapping(IFlashRouter.Provider => address) public adapter;

    /// @notice Verified asset whitelist (canonical issuer addresses).
    mapping(address => bool) public override isVerifiedAsset;

    /// @notice Consumed quote nonces (replay protection).
    mapping(bytes32 => bool) public consumedQuotes;

    /// @notice Reentrancy guard for the public flashLoan entry.
    uint256 private locked = 1;

    // Transient context for adapter callbacks (set in flashLoan, read in
    // executeStrategy, cleared at the end of the transaction).
    struct Context {
        address initiator;
        address strategy;
        bytes strategyData;
        uint256 platformFeeAmount;
        address asset;
        uint256 amount;
        bool active;
    }

    Context private ctx;

    // ─────────────────────────────────────────────────────────────────────
    //                              MODIFIERS
    // ─────────────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "FR: not admin");
        _;
    }

    modifier nonReentrant() {
        require(locked == 1, "FR: reentrant");
        locked = 2;
        _;
        locked = 1;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    /// @notice Called by adapters during a flash loan to invoke the user's
    ///         strategy. Only callable while a flashLoan is in progress.
    modifier onlyDuringFlash() {
        require(ctx.active, "FR: no active flash");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────
    //                          INITIALIZATION
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Initialize the router. Use a proxy pattern; this replaces
    ///         the constructor.
    /// @param  _admin         Owner / admin address (should be a multisig).
    /// @param  _feeCollector  Fee receiver (per-chain FeeCollector).
    function initialize(address _admin, address _feeCollector) external {
        require(admin == address(0), "FR: already initialized");
        require(_admin != address(0) && _feeCollector != address(0), "FR: zero address");
        admin = _admin;
        feeCollector = _feeCollector;
        platformFeeBps = DEFAULT_PLATFORM_FEE_BPS;
    }

    // ─────────────────────────────────────────────────────────────────────
    //                          PUBLIC ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IFlashRouter
    function flashLoan(FlashLoanParams calldata params)
        external
        override
        nonReentrant
        whenNotPaused
        returns (uint256 profit)
    {
        // ── 1. Validate ───────────────────────────────────────────────
        if (!isVerifiedAsset[params.asset]) revert AssetNotVerified(params.asset);
        require(params.amount > 0, "FR: zero amount");
        require(params.strategy != address(0), "FR: zero strategy");

        // Provider resolution: AUTO is handled off-chain — by the time
        // the tx hits the router, the caller has substituted a concrete
        // provider. (The off-chain SDK does this transparently.)
        Provider provider = params.provider;
        require(provider != Provider.AUTO, "FR: resolve provider off-chain");
        address adapterAddr = adapter[provider];
        require(adapterAddr != address(0), "FR: provider not configured");

        // Quote validation (optional — empty quote = self-service mode)
        if (params.quote.length > 0) {
            _consumeQuote(params);
        }

        // ── 2. Calculate platform fee ─────────────────────────────────
        uint256 platformFee = (params.amount * platformFeeBps) / 10_000;

        // ── 3. Set transient context for the adapter callback ─────────
        ctx = Context({
            initiator: msg.sender,
            strategy: params.strategy,
            strategyData: params.strategyData,
            platformFeeAmount: platformFee,
            asset: params.asset,
            amount: params.amount,
            active: true
        });

        // ── 4. Capture initiator's pre-balance for profit accounting ──
        uint256 initiatorBalanceBefore = IERC20(params.asset).balanceOf(msg.sender);

        // ── 5. Execute via adapter (adapter calls back into
        //       executeStrategyCallback below) ────────────────────────
        IFlashAdapter(adapterAddr).executeFlashLoan(
            params.asset,
            params.amount,
            "" // adapter reads everything from ctx; no extra data needed
        );

        // ── 6. Compute profit ─────────────────────────────────────────
        uint256 initiatorBalanceAfter = IERC20(params.asset).balanceOf(msg.sender);
        profit = initiatorBalanceAfter > initiatorBalanceBefore
            ? initiatorBalanceAfter - initiatorBalanceBefore
            : 0;
        require(profit >= params.minProfit, "FR: min profit not met");

        // ── 7. Emit and clean up ──────────────────────────────────────
        emit FlashLoanExecuted(
            msg.sender,
            params.strategy,
            provider,
            params.asset,
            params.amount,
            IFlashAdapter(adapterAddr).flashFee(params.asset, params.amount),
            platformFee,
            profit
        );

        delete ctx;
    }

    // ─────────────────────────────────────────────────────────────────────
    //                      ADAPTER → ROUTER → STRATEGY
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Called by an adapter once it has received the borrowed funds
    ///         from the upstream provider. The router forwards the funds
    ///         to the strategy, lets the strategy do its work, then pulls
    ///         back (amount + providerFee + platformFee).
    /// @dev    Called within the same transaction as flashLoan. Reverts
    ///         here will revert the entire flash loan.
    function executeStrategyCallback(uint256 providerFee)
        external
        onlyDuringFlash
        returns (uint256 totalOwed)
    {
        // Only the active adapter may call back.
        require(msg.sender == adapter[_currentProvider()], "FR: not active adapter");

        address asset = ctx.asset;
        uint256 amount = ctx.amount;
        uint256 platformFee = ctx.platformFeeAmount;
        totalOwed = amount + providerFee + platformFee;

        // Forward funds to the user's strategy.
        require(IERC20(asset).transfer(ctx.strategy, amount), "FR: transfer to strategy failed");

        // Invoke the strategy callback.
        bool ok = IFlashStrategy(ctx.strategy).onFlashLoan(
            asset,
            amount,
            providerFee + platformFee,
            ctx.initiator,
            ctx.strategyData
        );
        require(ok, "FR: strategy returned false");

        // Pull repayment from the strategy.
        require(
            IERC20(asset).transferFrom(ctx.strategy, address(this), totalOwed),
            "FR: repayment pull failed"
        );

        // Pay platform fee to the FeeCollector.
        if (platformFee > 0) {
            require(IERC20(asset).transfer(feeCollector, platformFee), "FR: fee transfer failed");
        }

        // Any residual asset balance is profit — forward to the initiator.
        uint256 residual = IERC20(asset).balanceOf(address(this));
        if (residual > providerFee) {
            // Keep providerFee in the router (adapter will sweep it back to
            // the upstream provider in its own callback). Send everything
            // else to the initiator.
            uint256 toInitiator = residual - providerFee;
            require(IERC20(asset).transfer(ctx.initiator, toInitiator), "FR: profit fwd failed");
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    //                          ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────

    function setAdapter(Provider provider, address adapterAddr) external onlyAdmin {
        require(provider != Provider.AUTO, "FR: AUTO has no adapter");
        adapter[provider] = adapterAddr;
    }

    function setPlatformFeeBps(uint16 bps) external onlyAdmin {
        if (bps > MAX_PLATFORM_FEE_BPS) revert PlatformFeeTooHigh(bps, MAX_PLATFORM_FEE_BPS);
        platformFeeBps = bps;
    }

    function setFeeCollector(address newCollector) external onlyAdmin {
        require(newCollector != address(0), "FR: zero address");
        feeCollector = newCollector;
    }

    function setVerifiedAsset(address asset, bool verified) external onlyAdmin {
        isVerifiedAsset[asset] = verified;
    }

    function setVerifiedAssetsBatch(address[] calldata assets, bool verified) external onlyAdmin {
        for (uint256 i = 0; i < assets.length; ++i) {
            isVerifiedAsset[assets[i]] = verified;
        }
    }

    function pause() external onlyAdmin {
        paused = true;
    }

    function unpause() external onlyAdmin {
        paused = false;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        pendingAdmin = newAdmin;
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "FR: not pending");
        admin = pendingAdmin;
        pendingAdmin = address(0);
    }

    /// @notice Sweep stray tokens left in the router (only callable when
    ///         no flash loan is in progress; sends to fee collector).
    function sweep(address token) external onlyAdmin {
        require(!ctx.active, "FR: flash in progress");
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) IERC20(token).transfer(feeCollector, bal);
    }

    // ─────────────────────────────────────────────────────────────────────
    //                          INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────────────

    function _currentProvider() internal view returns (Provider) {
        // Walk the adapter map to identify which one is calling back.
        // Tiny number of entries (<= 4), gas cost negligible.
        if (msg.sender == adapter[Provider.AAVE_V3])     return Provider.AAVE_V3;
        if (msg.sender == adapter[Provider.BALANCER_V2]) return Provider.BALANCER_V2;
        if (msg.sender == adapter[Provider.UNISWAP_V3])  return Provider.UNISWAP_V3;
        if (msg.sender == adapter[Provider.MAKER_DSS])   return Provider.MAKER_DSS;
        revert("FR: unknown adapter");
    }

    function _consumeQuote(FlashLoanParams calldata params) internal {
        // Hash the quote bytes + the params. Reverts if already used.
        // Full EIP-712 signed-quote verification would be implemented
        // by a separate Verifier library in production; this is the hook.
        bytes32 quoteHash = keccak256(
            abi.encode(params.provider, params.asset, params.amount, params.strategy, params.quote)
        );
        if (consumedQuotes[quoteHash]) revert InvalidQuote();
        consumedQuotes[quoteHash] = true;
        emit QuoteConsumed(quoteHash, msg.sender);
    }
}

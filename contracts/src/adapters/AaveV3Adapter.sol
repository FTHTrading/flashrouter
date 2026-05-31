// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {IFlashAdapter} from "../interfaces/IFlashAdapter.sol";

interface IAaveV3Pool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;

    function FLASHLOAN_PREMIUM_TOTAL() external view returns (uint128);
}

interface IFlashRouterCallback {
    function executeStrategyCallback(uint256 providerFee) external returns (uint256 totalOwed);
}

interface IERC20Min {
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @title AaveV3Adapter — FlashRouter adapter for Aave V3 flash loans
/// @notice Wraps Aave V3's flashLoanSimple. Aave calls back into this
///         adapter's executeOperation, which then calls back into the
///         FlashRouter to dispatch to the user's strategy and collect
///         repayment.
contract AaveV3Adapter is IFlashAdapter {
    IAaveV3Pool public immutable POOL;
    address public immutable ROUTER;
    uint8 public constant override providerId = 1; // matches Provider.AAVE_V3

    /// @notice Aave V3's premium is in 4 decimals (e.g. 5 = 0.05%)
    uint16 private constant PREMIUM_DECIMALS = 10_000;

    error OnlyPool();
    error OnlyRouter();
    error InitiatorMustBeAdapter();

    constructor(address _pool, address _router) {
        POOL = IAaveV3Pool(_pool);
        ROUTER = _router;
    }

    /// @inheritdoc IFlashAdapter
    function executeFlashLoan(address asset, uint256 amount, bytes calldata) external override {
        if (msg.sender != ROUTER) revert OnlyRouter();
        POOL.flashLoanSimple(address(this), asset, amount, "", 0);
    }

    /// @notice Aave V3 callback after sending the borrowed funds.
    /// @dev    Approves the pool to pull repayment, then delegates to
    ///         FlashRouter for strategy execution.
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata /* params */
    ) external returns (bool) {
        if (msg.sender != address(POOL)) revert OnlyPool();
        if (initiator != address(this)) revert InitiatorMustBeAdapter();

        // Forward funds to the router, which will forward to the strategy.
        IERC20Min(asset).approve(ROUTER, amount);
        // Router pulls amount from us via transferFrom (inside its callback).
        // For simplicity in this reference impl we send directly:
        // (production: use transferFrom-based flow for tighter accounting)
        require(_transfer(asset, ROUTER, amount), "AAVE: send to router failed");

        // Trigger router → strategy → repay flow.
        IFlashRouterCallback(ROUTER).executeStrategyCallback(premium);

        // After the router callback, the principal + premium should be
        // back in this adapter. Approve the pool to pull it.
        uint256 owed = amount + premium;
        IERC20Min(asset).approve(address(POOL), owed);
        return true;
    }

    /// @inheritdoc IFlashAdapter
    function flashFee(address /* asset */, uint256 amount) external view override returns (uint256) {
        uint128 premium = POOL.FLASHLOAN_PREMIUM_TOTAL();
        return (amount * premium) / PREMIUM_DECIMALS;
    }

    /// @inheritdoc IFlashAdapter
    function maxFlashLoan(address asset) external view override returns (uint256) {
        // Aave V3 max = pool's available liquidity for the asset.
        return IERC20Min(asset).balanceOf(address(POOL));
    }

    function _transfer(address token, address to, uint256 amount) internal returns (bool) {
        (bool ok, bytes memory data) =
            token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        return ok && (data.length == 0 || abi.decode(data, (bool)));
    }
}

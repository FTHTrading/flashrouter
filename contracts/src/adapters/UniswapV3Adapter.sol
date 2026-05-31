// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {IFlashAdapter} from "../interfaces/IFlashAdapter.sol";

interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;

    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
}

interface IFlashRouterCallback {
    function executeStrategyCallback(uint256 providerFee) external returns (uint256);
}

interface IERC20Min {
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @title UniswapV3Adapter — FlashRouter adapter for Uniswap V3 flash swaps
/// @notice Uniswap V3 charges the pool's swap fee tier (0.01%–1%) as the
///         flash-loan fee. The adapter must select a (pool, pairToken) for
///         the requested asset — we use a configured pairing table per chain.
contract UniswapV3Adapter is IFlashAdapter {
    IUniswapV3Factory public immutable FACTORY;
    address public immutable ROUTER;
    address public immutable PAIR_TOKEN; // default counter-asset for forming pools (usually WETH)
    uint8 public constant override providerId = 3; // matches Provider.UNISWAP_V3

    error OnlyPool();
    error OnlyRouter();
    error PoolNotFound();
    error InvalidPair();

    /// @param _factory Uniswap V3 Factory on this chain
    /// @param _router  FlashRouter address
    /// @param _pairToken Default counter-asset (WETH on most chains)
    constructor(address _factory, address _router, address _pairToken) {
        FACTORY = IUniswapV3Factory(_factory);
        ROUTER = _router;
        PAIR_TOKEN = _pairToken;
    }

    /// @inheritdoc IFlashAdapter
    function executeFlashLoan(address asset, uint256 amount, bytes calldata) external override {
        if (msg.sender != ROUTER) revert OnlyRouter();

        // Find a deep pool for (asset, PAIR_TOKEN) at the 0.05% tier (500)
        address pool = FACTORY.getPool(asset, PAIR_TOKEN, 500);
        if (pool == address(0)) {
            pool = FACTORY.getPool(asset, PAIR_TOKEN, 3000);
        }
        if (pool == address(0)) revert PoolNotFound();

        bool assetIsToken0 = IUniswapV3Pool(pool).token0() == asset;
        uint256 amt0 = assetIsToken0 ? amount : 0;
        uint256 amt1 = assetIsToken0 ? 0 : amount;

        IUniswapV3Pool(pool).flash(
            address(this),
            amt0,
            amt1,
            abi.encode(pool, asset, amount, assetIsToken0)
        );
    }

    /// @notice Uniswap V3 flash callback. Called by the pool after sending funds.
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        (address pool, address asset, uint256 amount, bool assetIsToken0) =
            abi.decode(data, (address, address, uint256, bool));
        if (msg.sender != pool) revert OnlyPool();

        uint256 fee = assetIsToken0 ? fee0 : fee1;

        // Send to router for strategy.
        require(IERC20Min(asset).transfer(ROUTER, amount), "UNI: send to router failed");

        IFlashRouterCallback(ROUTER).executeStrategyCallback(fee);

        // Pool pulls via direct transfer (Uniswap V3 pattern).
        require(IERC20Min(asset).transfer(pool, amount + fee), "UNI: repay failed");
    }

    /// @inheritdoc IFlashAdapter
    function flashFee(address asset, uint256 amount) external view override returns (uint256) {
        // Use 0.05% tier as the conservative default.
        address pool = FACTORY.getPool(asset, PAIR_TOKEN, 500);
        if (pool == address(0)) {
            pool = FACTORY.getPool(asset, PAIR_TOKEN, 3000);
            if (pool == address(0)) return type(uint256).max;
            return (amount * 3000) / 1_000_000;
        }
        return (amount * 500) / 1_000_000;
    }

    /// @inheritdoc IFlashAdapter
    function maxFlashLoan(address asset) external view override returns (uint256) {
        address pool = FACTORY.getPool(asset, PAIR_TOKEN, 500);
        if (pool == address(0)) {
            pool = FACTORY.getPool(asset, PAIR_TOKEN, 3000);
            if (pool == address(0)) return 0;
        }
        return IERC20Min(asset).balanceOf(pool);
    }
}

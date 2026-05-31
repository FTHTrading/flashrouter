// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {IFlashAdapter} from "../interfaces/IFlashAdapter.sol";

/// @notice MakerDAO DSS-Flash interface (ERC-3156 compatible).
///         https://github.com/makerdao/dss-flash
interface IERC3156FlashLender {
    function maxFlashLoan(address token) external view returns (uint256);
    function flashFee(address token, uint256 amount) external view returns (uint256);
    function flashLoan(
        address receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);
}

interface IFlashRouterCallback {
    function executeStrategyCallback(uint256 providerFee) external returns (uint256);
}

interface IERC20Min {
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}

/// @title MakerAdapter — FlashRouter adapter for MakerDAO DSS-Flash
/// @notice DAI flash mint up to 500M per transaction. Ethereum mainnet only.
///         Currently 0 fee (toll = 0 in Maker governance).
contract MakerAdapter is IFlashAdapter {
    /// @notice Required return value from onFlashLoan per ERC-3156
    bytes32 private constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    IERC3156FlashLender public immutable LENDER; // Maker DssFlash on mainnet
    address public immutable DAI; // 0x6B175474E89094C44Da98b954EedeAC495271d0F
    address public immutable ROUTER;
    uint8 public constant override providerId = 4; // matches Provider.MAKER_DSS

    error OnlyLender();
    error OnlyRouter();
    error UnsupportedAsset();
    error InitiatorMustBeAdapter();

    constructor(address _lender, address _dai, address _router) {
        LENDER = IERC3156FlashLender(_lender);
        DAI = _dai;
        ROUTER = _router;
    }

    /// @inheritdoc IFlashAdapter
    function executeFlashLoan(address asset, uint256 amount, bytes calldata) external override {
        if (msg.sender != ROUTER) revert OnlyRouter();
        if (asset != DAI) revert UnsupportedAsset();
        LENDER.flashLoan(address(this), asset, amount, "");
    }

    /// @notice ERC-3156 callback. Returns the required magic value on success.
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata /* data */
    ) external returns (bytes32) {
        if (msg.sender != address(LENDER)) revert OnlyLender();
        if (initiator != address(this)) revert InitiatorMustBeAdapter();

        // Send borrowed DAI to the router so it can forward to the strategy.
        require(IERC20Min(token).transfer(ROUTER, amount), "MAKER: send to router failed");

        IFlashRouterCallback(ROUTER).executeStrategyCallback(fee);

        // Approve the lender to pull repayment (DSS-Flash pulls via transferFrom).
        IERC20Min(token).approve(address(LENDER), amount + fee);

        return CALLBACK_SUCCESS;
    }

    /// @inheritdoc IFlashAdapter
    function flashFee(address asset, uint256 amount) external view override returns (uint256) {
        if (asset != DAI) return type(uint256).max;
        return LENDER.flashFee(asset, amount);
    }

    /// @inheritdoc IFlashAdapter
    function maxFlashLoan(address asset) external view override returns (uint256) {
        if (asset != DAI) return 0;
        return LENDER.maxFlashLoan(asset);
    }
}

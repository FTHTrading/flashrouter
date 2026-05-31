// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {IFlashAdapter} from "../interfaces/IFlashAdapter.sol";

interface IBalancerVault {
    function flashLoan(
        address recipient,
        address[] calldata tokens,
        uint256[] calldata amounts,
        bytes calldata userData
    ) external;
}

interface IFlashRouterCallback {
    function executeStrategyCallback(uint256 providerFee) external returns (uint256);
}

interface IERC20Min {
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @title BalancerV2Adapter — FlashRouter adapter for Balancer V2 flash loans
/// @notice Balancer V2 charges 0% fee — making it the cheapest provider.
///         Limited to assets held by Balancer's Vault.
contract BalancerV2Adapter is IFlashAdapter {
    IBalancerVault public immutable VAULT;
    address public immutable ROUTER;
    uint8 public constant override providerId = 2; // matches Provider.BALANCER_V2

    error OnlyVault();
    error OnlyRouter();

    constructor(address _vault, address _router) {
        VAULT = IBalancerVault(_vault);
        ROUTER = _router;
    }

    /// @inheritdoc IFlashAdapter
    function executeFlashLoan(address asset, uint256 amount, bytes calldata) external override {
        if (msg.sender != ROUTER) revert OnlyRouter();
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = asset;
        amounts[0] = amount;
        VAULT.flashLoan(address(this), tokens, amounts, "");
    }

    /// @notice Balancer V2 callback after sending the borrowed funds.
    function receiveFlashLoan(
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint256[] calldata feeAmounts,
        bytes calldata /* userData */
    ) external {
        if (msg.sender != address(VAULT)) revert OnlyVault();

        address asset = tokens[0];
        uint256 amount = amounts[0];
        uint256 fee = feeAmounts[0]; // 0 on Balancer V2, but respect the API

        // Send funds to the router.
        require(IERC20Min(asset).transfer(ROUTER, amount), "BAL: send to router failed");

        // Trigger strategy execution.
        IFlashRouterCallback(ROUTER).executeStrategyCallback(fee);

        // Repay the Vault directly (Vault pulls via balance, not transferFrom).
        require(IERC20Min(asset).transfer(address(VAULT), amount + fee), "BAL: repay failed");
    }

    /// @inheritdoc IFlashAdapter
    function flashFee(address, uint256) external pure override returns (uint256) {
        return 0; // Balancer V2 = 0% fee
    }

    /// @inheritdoc IFlashAdapter
    function maxFlashLoan(address asset) external view override returns (uint256) {
        return IERC20Min(asset).balanceOf(address(VAULT));
    }
}

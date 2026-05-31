// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IFlashAdapter} from "../../src/interfaces/IFlashAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

interface IFlashRouterCallback {
    function executeStrategyCallback(uint256 providerFee) external returns (uint256);
}

/// @notice Mock flash-loan adapter used in unit tests. Simulates a provider
///         that mints tokens to the router on borrow and accepts repayment
///         via balance.
contract MockAdapter is IFlashAdapter {
    address public immutable ROUTER;
    MockERC20 public immutable TOKEN;
    uint256 public constant FEE_BPS = 5; // 0.05%
    uint8 public constant override providerId = 1;

    constructor(address _router, address _token) {
        ROUTER = _router;
        TOKEN = MockERC20(_token);
    }

    function executeFlashLoan(address asset, uint256 amount, bytes calldata) external override {
        require(msg.sender == ROUTER, "MOCK: only router");
        require(asset == address(TOKEN), "MOCK: wrong asset");

        uint256 fee = (amount * FEE_BPS) / 10_000;

        // Mint borrowed funds to the router (simulating provider sending funds).
        TOKEN.mint(ROUTER, amount);

        // Trigger strategy execution.
        IFlashRouterCallback(ROUTER).executeStrategyCallback(fee);

        // Burn what we minted + fee from the adapter (proof of repayment).
        // In real adapters the upstream provider pulls this back; we just check
        // that the router left amount + fee available.
        require(TOKEN.balanceOf(address(this)) >= amount + fee, "MOCK: not repaid");
    }

    function flashFee(address, uint256 amount) external pure override returns (uint256) {
        return (amount * FEE_BPS) / 10_000;
    }

    function maxFlashLoan(address) external pure override returns (uint256) {
        return type(uint256).max;
    }
}

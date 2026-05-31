// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IFlashStrategy} from "../../src/interfaces/IFlashStrategy.sol";
import {MockERC20} from "./MockERC20.sol";

/// @notice Mock strategy that repays principal + fee + a small profit.
contract MockStrategy is IFlashStrategy {
    address public immutable ROUTER;
    MockERC20 public immutable TOKEN;

    constructor(address _router, address _token) {
        ROUTER = _router;
        TOKEN = MockERC20(_token);
    }

    function onFlashLoan(
        address asset,
        uint256 amount,
        uint256 totalFee,
        address /* initiator */,
        bytes calldata /* data */
    ) external override returns (bool) {
        require(msg.sender == ROUTER, "MS: only router");
        require(asset == address(TOKEN), "MS: wrong asset");

        // Pretend the strategy made a profit — mint amount + fee so we can repay
        // (in the real world, profit comes from arb/liquidation/etc).
        TOKEN.mint(address(this), totalFee);

        // Approve the router to pull principal + fee back.
        TOKEN.approve(ROUTER, amount + totalFee);
        return true;
    }
}

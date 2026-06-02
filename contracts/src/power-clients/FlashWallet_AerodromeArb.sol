// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * FlashWallet_AerodromeArb.sol
 * 
 * Example power client flash wallet for simple Aerodrome arbitrage on Base.
 * 
 * This is a filled example for a power client. Customize the routes, tokens, etc.
 * 
 * Strategy: Flash borrow USDC from Aave, swap to WETH on Aerodrome (buy low), swap back to USDC on another pool (sell high), repay.
 * 
 * In practice, client would monitor for arb opportunities offchain and pass params with the route.
 */

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

// Minimal Aerodrome Router interface (V2 style, common for AMMs)
interface IAerodromeRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract FlashWallet_AerodromeArb is FlashLoanSimpleReceiverBase {
    address payable public immutable owner;

    // Base addresses (update as needed)
    address public constant AERODROME_ROUTER = 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;
    address public constant WETH = 0x4200000000000000000000000000000000000006; // Base WETH
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    event ArbExecuted(uint256 amountIn, uint256 profit);

    constructor(address _addressProvider) 
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = payable(msg.sender);
    }

    function requestFlashLoan(address _token, uint256 _amount, bytes calldata _params) public {
        require(msg.sender == owner, "Only owner");
        POOL.flashLoanSimple(address(this), _token, _amount, _params, 0);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // === CLIENT'S AERODROME ARB STRATEGY ===
        // params can encode the routes or min amounts, e.g. for a specific arb opp.
        // For demo, hardcode a simple USDC -> WETH -> USDC via stable pools if possible.

        require(asset == USDC, "Only USDC for this example");

        uint256 totalOwed = amount + premium;

        // 1. Approve router
        IERC20(USDC).approve(AERODROME_ROUTER, amount);

        // 2. Swap USDC for WETH (example route; client would optimize)
        IAerodromeRouter.Route[] memory routes1 = new IAerodromeRouter.Route[](1);
        routes1[0] = IAerodromeRouter.Route({
            from: USDC,
            to: WETH,
            stable: false, // volatile pool usually
            factory: address(0) // default
        });

        // Min out set low for demo; in prod use oracle or quote
        uint256[] memory amountsOut1 = IAerodromeRouter(AERODROME_ROUTER).swapExactTokensForTokens(
            amount,
            0, // amountOutMin - client sets based on quote
            routes1,
            address(this),
            block.timestamp + 300
        );

        uint256 wethReceived = amountsOut1[1];

        // 3. Approve WETH for second swap
        IERC20(WETH).approve(AERODROME_ROUTER, wethReceived);

        // 4. Swap WETH back to USDC (different pool or same for demo)
        IAerodromeRouter.Route[] memory routes2 = new IAerodromeRouter.Route[](1);
        routes2[0] = IAerodromeRouter.Route({
            from: WETH,
            to: USDC,
            stable: false,
            factory: address(0)
        });

        uint256[] memory amountsOut2 = IAerodromeRouter(AERODROME_ROUTER).swapExactTokensForTokens(
            wethReceived,
            totalOwed, // min to cover loan
            routes2,
            address(this),
            block.timestamp + 300
        );

        uint256 usdcReceived = amountsOut2[1];

        // 5. Ensure profit (in real, check usdcReceived > totalOwed)
        require(usdcReceived >= totalOwed, "Arb not profitable");

        // 6. Approve POOL for repayment
        IERC20(USDC).approve(address(POOL), totalOwed);

        uint256 profit = usdcReceived - totalOwed;
        emit ArbExecuted(amount, profit);

        return true;
        // === END STRATEGY ===
    }

    function withdraw(address _token) public {
        require(msg.sender == owner, "Not owner");
        uint256 bal = IERC20(_token).balanceOf(address(this));
        if (bal > 0) IERC20(_token).transfer(owner, bal);
    }

    receive() external payable {}
}

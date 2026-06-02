// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Minimal Aerodrome Router interface for basic arb example (USDC -> WETH -> USDC)
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

contract FlashWallet_BasicArb is FlashLoanSimpleReceiverBase {
    address public owner;

    // Base mainnet addresses (Aave V3 PoolAddressesProvider, Aerodrome Router, tokens)
    address public constant AERODROME_ROUTER = 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Base USDC
    address public constant WETH = 0x4200000000000000000000000000000000000006; // Base WETH

    event FlashLoanExecuted(address asset, uint256 amount, uint256 profit);

    constructor(address _addressProvider) 
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = msg.sender;
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        
        uint256 totalOwed = amount + premium;

        // ============================
        // BASIC ARBITRAGE EXAMPLE STRATEGY
        // Borrow USDC -> swap to WETH on Aerodrome -> swap back to USDC -> repay
        // If profitable, profit stays in contract (owner withdraws)
        // ============================

        require(asset == USDC, "This example wallet is USDC only for demo");

        // 1. Approve router for USDC
        IERC20(USDC).approve(AERODROME_ROUTER, amount);

        // 2. Swap USDC -> WETH (route)
        IAerodromeRouter.Route[] memory routes1 = new IAerodromeRouter.Route[](1);
        routes1[0] = IAerodromeRouter.Route({
            from: USDC,
            to: WETH,
            stable: false,
            factory: address(0)
        });

        uint256[] memory amountsOut1 = IAerodromeRouter(AERODROME_ROUTER).swapExactTokensForTokens(
            amount,
            0, // accept any for demo (in prod set minOut from quote)
            routes1,
            address(this),
            block.timestamp + 300
        );

        uint256 wethReceived = amountsOut1[1];

        // 3. Approve router for WETH back
        IERC20(WETH).approve(AERODROME_ROUTER, wethReceived);

        // 4. Swap WETH -> USDC
        IAerodromeRouter.Route[] memory routes2 = new IAerodromeRouter.Route[](1);
        routes2[0] = IAerodromeRouter.Route({
            from: WETH,
            to: USDC,
            stable: false,
            factory: address(0)
        });

        uint256[] memory amountsOut2 = IAerodromeRouter(AERODROME_ROUTER).swapExactTokensForTokens(
            wethReceived,
            totalOwed, // min to at least cover loan+premium
            routes2,
            address(this),
            block.timestamp + 300
        );

        uint256 usdcBack = amountsOut2[1];

        // 5. Repay Aave
        IERC20(USDC).approve(address(POOL), totalOwed);

        uint256 profit = usdcBack > totalOwed ? (usdcBack - totalOwed) : 0;
        emit FlashLoanExecuted(asset, amount, profit);

        return true;
    }

    function requestFlashLoan(address _asset, uint256 _amount) external {
        require(msg.sender == owner, "Only owner");
        
        POOL.flashLoanSimple(
            address(this),
            _asset,
            _amount,
            "",
            0
        );
    }

    function withdraw(address _asset) external {
        require(msg.sender == owner, "Only owner");
        IERC20(_asset).transfer(owner, IERC20(_asset).balanceOf(address(this)));
    }
}

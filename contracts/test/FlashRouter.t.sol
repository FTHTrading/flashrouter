// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FlashRouter} from "../src/FlashRouter.sol";
import {FeeCollector} from "../src/FeeCollector.sol";
import {IFlashRouter} from "../src/interfaces/IFlashRouter.sol";
import {IFlashStrategy} from "../src/interfaces/IFlashStrategy.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockAdapter} from "./mocks/MockAdapter.sol";
import {MockStrategy} from "./mocks/MockStrategy.sol";

/// @notice Foundry test suite for FlashRouter core.
/// @dev    Run: forge test -vvv
///         Coverage target: 90%+ on FlashRouter.sol
contract FlashRouterTest is Test {
    FlashRouter router;
    FeeCollector collector;
    MockERC20 usdc;
    MockAdapter adapter;
    MockStrategy strategy;

    address constant ADMIN    = address(0xA11CE);
    address constant TREASURY = address(0xB0B);
    address constant USER     = address(0xC4FE);

    event FlashLoanExecuted(
        address indexed caller,
        address indexed strategy,
        IFlashRouter.Provider indexed provider,
        address asset,
        uint256 amount,
        uint256 providerFee,
        uint256 platformFee,
        uint256 profit
    );

    function setUp() public {
        collector = new FeeCollector(ADMIN, TREASURY);
        router = new FlashRouter();
        router.initialize(ADMIN, address(collector));

        usdc = new MockERC20("USDC", "USDC", 6);
        adapter = new MockAdapter(address(router), address(usdc));
        strategy = new MockStrategy(address(router), address(usdc));

        vm.prank(ADMIN);
        router.setAdapter(IFlashRouter.Provider.AAVE_V3, address(adapter));
        vm.prank(ADMIN);
        router.setVerifiedAsset(address(usdc), true);
    }

    // ─────────────────────── Initialization ───────────────────────

    function test_initialState() public view {
        assertEq(router.admin(), ADMIN);
        assertEq(router.feeCollector(), address(collector));
        assertEq(router.platformFeeBps(), 2);
        assertEq(router.MAX_PLATFORM_FEE_BPS(), 10);
        assertFalse(router.paused());
    }

    function test_cannotInitTwice() public {
        vm.expectRevert(bytes("FR: already initialized"));
        router.initialize(ADMIN, address(collector));
    }

    function test_cannotInitWithZero() public {
        FlashRouter fresh = new FlashRouter();
        vm.expectRevert(bytes("FR: zero address"));
        fresh.initialize(address(0), address(collector));
    }

    // ─────────────────────── Asset verification ───────────────────

    function test_unverifiedAssetReverts() public {
        MockERC20 fake = new MockERC20("Fake USDT", "USDT", 6);
        IFlashRouter.FlashLoanParams memory p = IFlashRouter.FlashLoanParams({
            provider: IFlashRouter.Provider.AAVE_V3,
            asset: address(fake),
            amount: 1_000_000,
            strategy: address(strategy),
            strategyData: "",
            minProfit: 0,
            quote: ""
        });
        vm.expectRevert(abi.encodeWithSelector(IFlashRouter.AssetNotVerified.selector, address(fake)));
        router.flashLoan(p);
    }

    function test_setVerifiedAssetsBatch() public {
        address[] memory assets = new address[](3);
        assets[0] = address(0x1111);
        assets[1] = address(0x2222);
        assets[2] = address(0x3333);
        vm.prank(ADMIN);
        router.setVerifiedAssetsBatch(assets, true);
        assertTrue(router.isVerifiedAsset(assets[0]));
        assertTrue(router.isVerifiedAsset(assets[1]));
        assertTrue(router.isVerifiedAsset(assets[2]));
    }

    // ─────────────────────── Platform fee ─────────────────────────

    function test_setPlatformFeeBps() public {
        vm.prank(ADMIN);
        router.setPlatformFeeBps(5);
        assertEq(router.platformFeeBps(), 5);
    }

    function test_setPlatformFee_capped() public {
        vm.prank(ADMIN);
        vm.expectRevert(
            abi.encodeWithSelector(IFlashRouter.PlatformFeeTooHigh.selector, uint16(11), uint16(10))
        );
        router.setPlatformFeeBps(11);
    }

    function test_setPlatformFee_onlyAdmin() public {
        vm.prank(USER);
        vm.expectRevert(bytes("FR: not admin"));
        router.setPlatformFeeBps(5);
    }

    // ─────────────────────── Pausing ──────────────────────────────

    function test_pause_unpause() public {
        vm.prank(ADMIN);
        router.pause();
        assertTrue(router.paused());

        IFlashRouter.FlashLoanParams memory p = IFlashRouter.FlashLoanParams({
            provider: IFlashRouter.Provider.AAVE_V3,
            asset: address(usdc),
            amount: 1_000_000,
            strategy: address(strategy),
            strategyData: "",
            minProfit: 0,
            quote: ""
        });
        vm.expectRevert(IFlashRouter.Paused.selector);
        router.flashLoan(p);

        vm.prank(ADMIN);
        router.unpause();
        assertFalse(router.paused());
    }

    // ─────────────────────── Admin transfer ───────────────────────

    function test_adminTransfer() public {
        address newAdmin = address(0xABCD);
        vm.prank(ADMIN);
        router.transferAdmin(newAdmin);
        assertEq(router.pendingAdmin(), newAdmin);
        // Old admin still in charge until accept
        assertEq(router.admin(), ADMIN);

        vm.prank(newAdmin);
        router.acceptAdmin();
        assertEq(router.admin(), newAdmin);
        assertEq(router.pendingAdmin(), address(0));
    }

    function test_acceptAdmin_onlyPending() public {
        vm.prank(ADMIN);
        router.transferAdmin(address(0xABCD));
        vm.prank(USER);
        vm.expectRevert(bytes("FR: not pending"));
        router.acceptAdmin();
    }

    // ─────────────────────── AUTO provider blocked on-chain ───────

    function test_autoProviderRejected() public {
        IFlashRouter.FlashLoanParams memory p = IFlashRouter.FlashLoanParams({
            provider: IFlashRouter.Provider.AUTO,
            asset: address(usdc),
            amount: 1_000_000,
            strategy: address(strategy),
            strategyData: "",
            minProfit: 0,
            quote: ""
        });
        vm.expectRevert(bytes("FR: resolve provider off-chain"));
        router.flashLoan(p);
    }

    function test_unconfiguredProviderReverts() public {
        IFlashRouter.FlashLoanParams memory p = IFlashRouter.FlashLoanParams({
            provider: IFlashRouter.Provider.MAKER_DSS, // not configured in setUp
            asset: address(usdc),
            amount: 1_000_000,
            strategy: address(strategy),
            strategyData: "",
            minProfit: 0,
            quote: ""
        });
        vm.expectRevert(bytes("FR: provider not configured"));
        router.flashLoan(p);
    }

    // ─────────────────────── Sweep ────────────────────────────────

    function test_sweep() public {
        usdc.mint(address(router), 5_000);
        vm.prank(ADMIN);
        router.sweep(address(usdc));
        assertEq(usdc.balanceOf(address(collector)), 5_000);
    }

    function test_sweep_onlyAdmin() public {
        vm.prank(USER);
        vm.expectRevert(bytes("FR: not admin"));
        router.sweep(address(usdc));
    }
}

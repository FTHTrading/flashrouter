// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {FlashRouter} from "../src/FlashRouter.sol";
import {FeeCollector} from "../src/FeeCollector.sol";
import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {BalancerV2Adapter} from "../src/adapters/BalancerV2Adapter.sol";
import {UniswapV3Adapter} from "../src/adapters/UniswapV3Adapter.sol";
import {MakerAdapter} from "../src/adapters/MakerAdapter.sol";
import {IFlashRouter} from "../src/interfaces/IFlashRouter.sol";

/// @notice One-shot deployment script for FlashRouter on a single chain.
/// @dev    Run with:
///         forge script script/Deploy.s.sol --rpc-url <RPC> --broadcast --verify
///
/// Required env vars (per chain):
///   ADMIN_ADDRESS       multisig that owns the router
///   TREASURY_ADDRESS    final destination of platform fees
///   AAVE_V3_POOL        Aave V3 Pool on this chain (or 0x0 to skip)
///   BALANCER_VAULT      Balancer V2 Vault (or 0x0 to skip)
///   UNISWAP_V3_FACTORY  Uniswap V3 Factory (or 0x0 to skip)
///   UNISWAP_PAIR_TOKEN  Default counter-asset (typically WETH)
///   MAKER_DSS_FLASH     Maker DssFlash (Ethereum only — 0x0 elsewhere)
///   MAKER_DAI           DAI address (Ethereum only)
contract DeployScript is Script {
    function run() external {
        address admin    = vm.envAddress("ADMIN_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address aavePool = vm.envOr("AAVE_V3_POOL", address(0));
        address balVault = vm.envOr("BALANCER_VAULT", address(0));
        address uniFact  = vm.envOr("UNISWAP_V3_FACTORY", address(0));
        address pairTok  = vm.envOr("UNISWAP_PAIR_TOKEN", address(0));
        address makerDss = vm.envOr("MAKER_DSS_FLASH", address(0));
        address makerDai = vm.envOr("MAKER_DAI", address(0));

        vm.startBroadcast();

        // 1. Treasury
        FeeCollector feeCollector = new FeeCollector(admin, treasury);

        // 2. Router (initialize replaces constructor for upgradeability)
        FlashRouter router = new FlashRouter();
        router.initialize(admin, address(feeCollector));

        // 3. Adapters (only register the ones that exist on this chain)
        if (aavePool != address(0)) {
            AaveV3Adapter a = new AaveV3Adapter(aavePool, address(router));
            router.setAdapter(IFlashRouter.Provider.AAVE_V3, address(a));
        }
        if (balVault != address(0)) {
            BalancerV2Adapter b = new BalancerV2Adapter(balVault, address(router));
            router.setAdapter(IFlashRouter.Provider.BALANCER_V2, address(b));
        }
        if (uniFact != address(0) && pairTok != address(0)) {
            UniswapV3Adapter u = new UniswapV3Adapter(uniFact, address(router), pairTok);
            router.setAdapter(IFlashRouter.Provider.UNISWAP_V3, address(u));
        }
        if (makerDss != address(0) && makerDai != address(0)) {
            MakerAdapter m = new MakerAdapter(makerDss, makerDai, address(router));
            router.setAdapter(IFlashRouter.Provider.MAKER_DSS, address(m));
        }

        vm.stopBroadcast();
    }
}

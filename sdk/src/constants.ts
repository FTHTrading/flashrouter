import { Provider, type ChainName } from "./types";

/**
 * Per-chain canonical addresses. All addresses are checksummed.
 * Replace with your actual deployed FlashRouter addresses after mainnet deploy.
 */
export const CHAINS: Record<
  ChainName,
  {
    chainId: number;
    flashRouter: `0x${string}`;
    feeCollector: `0x${string}`;
    explorerUrl: string;
    rpcUrlEnv: string;
    nativeSymbol: string;
  }
> = {
  ethereum: {
    chainId: 1,
    flashRouter: "0x0000000000000000000000000000000000000000", // TBD post-deploy
    feeCollector: "0x0000000000000000000000000000000000000000",
    explorerUrl: "https://etherscan.io",
    rpcUrlEnv: "ETH_RPC_URL",
    nativeSymbol: "ETH",
  },
  base: {
    chainId: 8453,
    flashRouter: "0x0000000000000000000000000000000000000000",
    feeCollector: "0x0000000000000000000000000000000000000000",
    explorerUrl: "https://basescan.org",
    rpcUrlEnv: "BASE_RPC_URL",
    nativeSymbol: "ETH",
  },
  arbitrum: {
    chainId: 42161,
    flashRouter: "0x0000000000000000000000000000000000000000",
    feeCollector: "0x0000000000000000000000000000000000000000",
    explorerUrl: "https://arbiscan.io",
    rpcUrlEnv: "ARB_RPC_URL",
    nativeSymbol: "ETH",
  },
  optimism: {
    chainId: 10,
    flashRouter: "0x0000000000000000000000000000000000000000",
    feeCollector: "0x0000000000000000000000000000000000000000",
    explorerUrl: "https://optimistic.etherscan.io",
    rpcUrlEnv: "OP_RPC_URL",
    nativeSymbol: "ETH",
  },
  bnb: {
    chainId: 56,
    flashRouter: "0x0000000000000000000000000000000000000000",
    feeCollector: "0x0000000000000000000000000000000000000000",
    explorerUrl: "https://bscscan.com",
    rpcUrlEnv: "BNB_RPC_URL",
    nativeSymbol: "BNB",
  },
  polygon: {
    chainId: 137,
    flashRouter: "0x0000000000000000000000000000000000000000",
    feeCollector: "0x0000000000000000000000000000000000000000",
    explorerUrl: "https://polygonscan.com",
    rpcUrlEnv: "POLYGON_RPC_URL",
    nativeSymbol: "POL",
  },
};

export const PROVIDERS = {
  [Provider.AUTO]: "AUTO (cheapest)",
  [Provider.AAVE_V3]: "Aave V3",
  [Provider.BALANCER_V2]: "Balancer V2",
  [Provider.UNISWAP_V3]: "Uniswap V3",
  [Provider.MAKER_DSS]: "MakerDAO DSS-Flash",
} as const;

/**
 * Canonical verified-issuer asset addresses per chain.
 *
 * This is the on-SDK reflection of the on-chain isVerifiedAsset whitelist.
 * If an asset symbol resolves to an address NOT on this list, the SDK
 * refuses the request (matching the on-chain revert) and warns the user
 * with a clear "this asset is not the canonical issuer" message.
 *
 * Source: Tether, Circle, MakerDAO official docs.
 */
export const VERIFIED_ASSETS: Record<ChainName, Record<string, `0x${string}`>> = {
  ethereum: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI:  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  },
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
  },
  arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  },
  optimism: {
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI:  "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    WETH: "0x4200000000000000000000000000000000000006",
  },
  bnb: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
  },
  polygon: {
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    DAI:  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
  },
};

export const DEFAULT_API_URL = "https://api.flashrouter.io";

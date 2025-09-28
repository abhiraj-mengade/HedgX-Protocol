import { getContract } from "thirdweb";
import { client } from "@/app/client";
import { CONTRACT_CONFIG, getRpcUrl } from "./config";
import contractAbi from "./contract.abi.json";

// Contract instance with error handling
let hedgxVaultContract: any;

try {
  hedgxVaultContract = getContract({
    client,
    chain: {
      id: CONTRACT_CONFIG.CHAIN_ID,
      rpc: getRpcUrl(CONTRACT_CONFIG.CHAIN_ID),
    },
    address: CONTRACT_CONFIG.HEDGX_VAULT_ADDRESS,
    abi: contractAbi as any,
  });
} catch (error) {
  console.error("Failed to initialize contract:", error);
  // Create a fallback contract instance
  hedgxVaultContract = getContract({
    client,
    chain: {
      id: CONTRACT_CONFIG.CHAIN_ID,
      rpc: getRpcUrl(CONTRACT_CONFIG.CHAIN_ID),
    },
    address: "0x0000000000000000000000000000000000000000", // Zero address as fallback
    abi: [] as any, // Empty ABI as fallback
  });
}

export { hedgxVaultContract };

// Contract constants
export const BASIS_POINTS = CONTRACT_CONFIG.BASIS_POINTS;
export const LEVERAGE = CONTRACT_CONFIG.LEVERAGE;

// Helper functions
export const formatBasisPoints = (bps: bigint): string => {
  return ((Number(bps) / BASIS_POINTS) * 100).toFixed(2) + "%";
};

export const formatETH = (wei: bigint): string => {
  return (Number(wei) / 1e18).toFixed(4) + " ETH";
};

export const formatToken = (wei: bigint): string => {
  return (Number(wei) / 1e18).toFixed(4) + " Token";
};

export const formatETHValue = (wei: bigint): string => {
  return (Number(wei) / 1e18).toFixed(4);
};

export const parseETH = (eth: string): bigint => {
  return BigInt(Math.floor(parseFloat(eth) * 1e18));
};

export const formatTimeRemaining = (timestamp: bigint): string => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(timestamp) - now;
  
  if (remaining <= 0) return "Expired";
  
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  
  return `${days}d ${hours}h`;
};

// Position side enum
export enum Side {
  Long = 0,
  Short = 1,
}

// Position interface
export interface Position {
  exposureAmount: bigint;
  fixedRate: bigint;
  mintTime: bigint;
  side: Side;
}

// Limit order interface
export interface LimitOrder {
  user: string;
  amount: bigint;
  rate: bigint;
  side: Side;
  isActive: boolean;
}

// Market data interface
export interface MarketData {
  currentCycleId: bigint;
  cycleStart: bigint;
  cycleEnd: bigint;
  currentEpoch: bigint;
  totalEpochs: bigint;
  currentFundingRateBps: bigint;
  impliedRate: bigint;
  longIndex: bigint;
  shortIndex: bigint;
  vaultLiquidity: bigint;
  vaultTradingEnabled: boolean;
}

// Orderbook data interface
export interface OrderbookData {
  longOrders: bigint;
  shortOrders: bigint;
  longWeightedRate: bigint;
  shortWeightedRate: bigint;
  bestLongRate: bigint;
  bestShortRate: bigint;
  spread: bigint;
}

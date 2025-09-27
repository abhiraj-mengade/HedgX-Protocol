import { defineChain } from "thirdweb";

// Contract configuration
export const CONTRACT_CONFIG = {
  // Update this with your deployed contract address
  HEDGX_VAULT_ADDRESS:
    process.env.NEXT_PUBLIC_HEDGX_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000",

  // Chain configuration - Default to Sepolia testnet
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111"), // Default to Sepolia testnet

  // RPC URLs for different chains
  RPC_URLS: {
    1: "https://eth.llamarpc.com", // Ethereum mainnet
    11155111: "https://ethereum-sepolia-rpc.publicnode.com", // Sepolia testnet
    31: "https://public-node.testnet.rsk.co", // Rootstock Testnet
    296: "https://testnet.hashio.io/api", // Hedera Testnet
    5115: "https://rpc.testnet.citrea.xyz", // Citrea Testnet
    31337: "http://localhost:8545", // Local development
  },

  // Contract constants
  BASIS_POINTS: 10000,
  LEVERAGE: 5,
  COLLATERAL_RATIO: 0.2, // 20% collateral for 5x leverage
  CYCLE_LENGTH: 30 * 24 * 60 * 60, // 30 days in seconds
  EPOCH_LENGTH: 8 * 60 * 60, // 8 hours in seconds
};

// Environment validation
export function validateConfig() {
  if (CONTRACT_CONFIG.HEDGX_VAULT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn("⚠️  HedgXVault contract address not set. Please update NEXT_PUBLIC_HEDGX_VAULT_ADDRESS in your environment variables.");
  }

  if (!process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID) {
    console.warn("⚠️  Thirdweb client ID not set. Please update NEXT_PUBLIC_TEMPLATE_CLIENT_ID in your environment variables.");
  }
}

// Helper function to get RPC URL for current chain
export function getRpcUrl(chainId: number): string {
  return CONTRACT_CONFIG.RPC_URLS[chainId as keyof typeof CONTRACT_CONFIG.RPC_URLS] || CONTRACT_CONFIG.RPC_URLS[1];
}

export const rootstock_testnet = defineChain({ id: 31, testnet: true });
export const citrea_testnet = defineChain({ id: 5115, rpc: "https://rpc.testnet.citrea.xyz", name: "Citrea Testnet", nativeCurrency: { name: "cBTC", symbol: "cBTC", decimals: 18 }, blockExplorers: [{ name: "Citrea Explorer", url: "https://explorer.citrea.xyz" }], testnet: true });
export const hedera_testnet = defineChain({ id: 296, testnet: true });

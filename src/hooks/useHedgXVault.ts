"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  readContract, 
  prepareContractCall, 
  sendTransaction,
  waitForReceipt,
  getContract
} from "thirdweb";
import { 
  hedgxVaultContract, 
  formatBasisPoints, 
  formatETH, 
  parseETH,
  formatTimeRemaining,
  Side,
  type Position,
  type LimitOrder,
  type MarketData,
  type OrderbookData
} from "@/lib/contract";
import { useActiveAccount } from "thirdweb/react";
import { ethers } from 'ethers';

// Hook for market data
export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching market data...");
      console.log("Contract address:", hedgxVaultContract?.address);
      console.log("Contract ABI length:", hedgxVaultContract?.abi?.length);

      // Check if contract is properly initialized
      if (!hedgxVaultContract || hedgxVaultContract.address === "0x0000000000000000000000000000000000000000") {
        console.warn("Contract not properly initialized. Using mock data for development.");
        // Return mock data for development
        setMarketData({
          currentCycleId: 1n,
          cycleStart: BigInt(Math.floor(Date.now() / 1000)),
          cycleEnd: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
          currentEpoch: 0n,
          totalEpochs: 90n,
          currentFundingRateBps: 500n, // 5%
          impliedRate: 520n, // 5.2%
          longIndex: 0n,
          shortIndex: 0n,
          vaultLiquidity: 1000000000000000000n, // 1 ETH
          vaultTradingEnabled: true
        });
        setLoading(false);
        return;
      }

      // Batch the essential contract calls to reduce RPC requests
      console.log("Fetching essential market data...");
      
      const [
        currentCycleId,
        cycleStart,
        cycleEnd,
        currentEpoch,
        totalEpochs,
        currentFundingRateBps,
        impliedRate,
        vaultLiquidity,
        vaultTradingEnabled
      ] = await Promise.all([
        (readContract as any)({ contract: hedgxVaultContract, method: "currentCycleId" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "cycleStart" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "cycleEnd" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "currentEpoch" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "totalEpochs" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "currentFundingRateBps" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "getImpliedRate" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "vaultLiquidity" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "vaultTradingEnabled" })
      ]);

      // Get indices separately to avoid too many requests
      console.log("Fetching funding indices...");
      const [longIndex, shortIndex] = await Promise.all([
        (readContract as any)({ contract: hedgxVaultContract, method: "longIndex" }),
        (readContract as any)({ contract: hedgxVaultContract, method: "shortIndex" })
      ]);

      setMarketData({
        currentCycleId,
        cycleStart,
        cycleEnd,
        currentEpoch,
        totalEpochs,
        currentFundingRateBps,
        impliedRate,
        longIndex,
        shortIndex,
        vaultLiquidity,
        vaultTradingEnabled
      });
    } catch (err) {
      console.error("Error fetching market data:", err);
      
      // If it's a JSON parsing error, provide more specific information
      if (err instanceof Error && err.message.includes("JSON")) {
        setError("JSON parsing error. This might be due to contract configuration issues.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch market data");
      }
      
      // Set mock data as fallback
      setMarketData({
        currentCycleId: 1n,
        cycleStart: BigInt(Math.floor(Date.now() / 1000)),
        cycleEnd: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
        currentEpoch: 0n,
        totalEpochs: 90n,
        currentFundingRateBps: 500n, // 5%
        impliedRate: 520n, // 5.2%
        longIndex: 0n,
        shortIndex: 0n,
        vaultLiquidity: 1000000000000000000n, // 1 ETH
        vaultTradingEnabled: true
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
    // Refresh every 60 seconds to reduce RPC calls
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  return { marketData, loading, error, refetch: fetchMarketData };
}

// Hook for historical data (extrapolated from current contract state)
export function useHistoricalData() {
  const { marketData } = useMarketData();
  const { ethPrice } = useEthPrice();
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!marketData || !ethPrice) {
      setLoading(true);
      return;
    }

    // Generate historical data based on current contract state
    const generateHistoricalData = () => {
      const now = new Date();
      const days = [];
      
      // Generate data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Use current implied rate as base and add some realistic variation
        const currentImpliedRate = Number(marketData.impliedRate) / 100; // Convert basis points to percentage
        const currentFundingRate = Number(marketData.currentFundingRateBps) / 100; // Convert basis points to percentage
        
        // Add realistic daily variation (±10% of current rate)
        const impliedVariation = (Math.random() - 0.5) * 0.2; // ±10%
        const fundingVariation = (Math.random() - 0.5) * 0.15; // ±7.5%
        
        const impliedAPR = Math.max(0, currentImpliedRate + impliedVariation);
        const underlyingAPR = Math.max(0, currentFundingRate + fundingVariation);
        
        // Generate ETH price variation (±5% daily)
        const ethVariation = (Math.random() - 0.5) * 0.1; // ±5%
        const ethPriceVariation = ethPrice * (1 + ethVariation);
        
        days.push({
          date: date.toISOString().split('T')[0].slice(5), // MM-DD format
          impliedAPR: parseFloat(impliedAPR.toFixed(2)),
          underlyingAPR: parseFloat(underlyingAPR.toFixed(2)),
          ethPrice: parseFloat(ethPriceVariation.toFixed(2)),
          timestamp: date.getTime()
        });
      }
      
      return days;
    };

    const data = generateHistoricalData();
    setHistoricalData(data);
    setLoading(false);
  }, [marketData, ethPrice]);

  return { historicalData, loading };
}

// Hook for ETH price from Pyth oracle
export function useEthPrice() {
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEthPrice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Pyth contract address and ETH price ID
      const contractAddress = '0x4305FB66699C3B2702D4d05CF36551390A4c69C6';
      const ethPriceId = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'; // ETH/USD price ID
      
      const provider = new ethers.JsonRpcProvider('https://eth.merkle.io');
      
      // Pyth ABI for getPrice function
      const pythAbi = [
        "function getPrice(bytes32 priceId) external view returns (tuple(int64 price, uint64 conf, int32 expo, uint256 publishTime) memory)"
      ];
      
      const contract = new ethers.Contract(contractAddress, pythAbi, provider);
      
      const [price, conf, expo, timestamp] = await contract.getPrice(ethPriceId);
      
      // Convert price to USD (price is in 10^expo format)
      const priceInUsd = Number(price) / Math.pow(10, -Number(expo));
      
      setEthPrice(priceInUsd);
    } catch (err) {
      console.error("Error fetching ETH price:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch ETH price");
      
      // Fallback to a reasonable ETH price for development
      setEthPrice(3500); // $3500 as fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEthPrice();
    // Refresh every 30 seconds
    const interval = setInterval(fetchEthPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchEthPrice]);

  return { ethPrice, loading, error, refetch: fetchEthPrice };
}

// Hook for user positions
export function useUserPositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const account = useActiveAccount();

  const fetchPositions = useCallback(async () => {
    if (!account?.address) {
      setPositions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const nextPositionId = await (readContract as any)({
        contract: hedgxVaultContract,
        method: "nextPositionId",
        params: [account.address]
      });

      const positionPromises = [];
      for (let i = 0; i < Number(nextPositionId); i++) {
        positionPromises.push(
          (readContract as any)({
            contract: hedgxVaultContract as any,
            method: "getPosition",
            params: [account.address, BigInt(i)]
          })
        );
      }

      const positionResults = await Promise.all(positionPromises);
      const validPositions = positionResults.filter(pos => pos.exposureAmount > 0n);
      
      setPositions(validPositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch positions");
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions };
}

// Hook for orderbook data
export function useOrderbookData() {
  const [orderbookData, setOrderbookData] = useState<OrderbookData | null>(null);
  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderbookData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get orderbook status and best rates
      const [longOrders, shortOrders, longWeightedRate, shortWeightedRate] = await (readContract as any)({
        contract: hedgxVaultContract as any,
        method: "getOrderbookStatus"
      });

      // Get best rates and spread (with fallback for old contracts)
      let bestLongRate = 0n;
      let bestShortRate = 0n;
      let spread = 0n;

      try {
        const [bestLong, bestShort] = await (readContract as any)({
          contract: hedgxVaultContract as any,
          method: "getBestTwoOrders"
        });
        bestLongRate = bestLong;
        bestShortRate = bestShort;

        const spreadResult = await (readContract as any)({
          contract: hedgxVaultContract as any,
          method: "getSpread"
        });
        spread = spreadResult;
      } catch (error) {
        console.warn("New orderbook functions not available, using fallback values");
        // Fallback: use current funding rate for both
        bestLongRate = 500n; // 5% default
        bestShortRate = 500n; // 5% default
        spread = 0n;
      }

      setOrderbookData({
        longOrders,
        shortOrders,
        longWeightedRate,
        shortWeightedRate,
        bestLongRate,
        bestShortRate,
        spread
      });

      // Get individual limit orders (check first few order IDs)
      const orders: LimitOrder[] = [];
      
      // First, get the nextOrderId to know how many orders exist
      const nextOrderId = await (readContract as any)({
        contract: hedgxVaultContract as any,
        method: "nextOrderId"
      });
      
      console.log("Next Order ID:", nextOrderId);
      
      // Check all existing orders
      for (let i = 0; i < Number(nextOrderId); i++) {
        try {
          const orderArray = await (readContract as any)({
            contract: hedgxVaultContract as any,
            method: "getLimitOrder",
            params: [BigInt(i)]
          });
          
          console.log(`Order ${i}:`, orderArray);
          
          // Convert array to object format
          const order = {
            user: orderArray[0],
            amount: orderArray[1],
            rate: orderArray[2],
            side: orderArray[3],
            isActive: orderArray[4]
          };
          
          console.log(`Order ${i} parsed:`, order);
          
          if (order.isActive) {
            orders.push(order);
          }
        } catch (err) {
          console.log(`Order ${i} not found or error:`, err);
          // Continue checking other orders
        }
      }

      setLimitOrders(orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orderbook data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrderbookData();
    // Refresh every 30 seconds to reduce RPC calls
    const interval = setInterval(fetchOrderbookData, 30000);
    return () => clearInterval(interval);
  }, [fetchOrderbookData]);

  return { orderbookData, limitOrders, loading, error, refetch: fetchOrderbookData };
}

// Hook for trading operations
export function useTrading() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = useActiveAccount();

  const mintMarketLong = useCallback(async (exposureAmount: string, value: string) => {
    if (!account) throw new Error("No account connected");

    try {
      setLoading(true);
      setError(null);

      const transaction = (prepareContractCall as any)({
        contract: hedgxVaultContract,
        method: "mintMarketLong",
        params: [parseETH(exposureAmount)],
        value: parseETH(value)
      });

      const result = await sendTransaction({ transaction, account });
      const receipt = await waitForReceipt(result);
      
      return receipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account]);

  const mintMarketShort = useCallback(async (exposureAmount: string, value: string) => {
    if (!account) throw new Error("No account connected");

    try {
      setLoading(true);
      setError(null);

      const transaction = (prepareContractCall as any)({
        contract: hedgxVaultContract,
        method: "mintMarketShort",
        params: [parseETH(exposureAmount)],
        value: parseETH(value)
      });

      const result = await sendTransaction({ transaction, account });
      const receipt = await waitForReceipt(result);
      
      return receipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account]);

  const mintLimitLong = useCallback(async (exposureAmount: string, limitBps: string, value: string) => {
    if (!account) throw new Error("No account connected");

    try {
      setLoading(true);
      setError(null);

      const transaction = (prepareContractCall as any)({
        contract: hedgxVaultContract,
        method: "mintLimitLong",
        params: [parseETH(exposureAmount), BigInt(limitBps)],
        value: parseETH(value)
      });

      const result = await sendTransaction({ transaction, account });
      const receipt = await waitForReceipt(result);
      
      return receipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account]);

  const mintLimitShort = useCallback(async (exposureAmount: string, limitBps: string, value: string) => {
    if (!account) throw new Error("No account connected");

    try {
      setLoading(true);
      setError(null);

      const transaction = (prepareContractCall as any)({
        contract: hedgxVaultContract,
        method: "mintLimitShort",
        params: [parseETH(exposureAmount), BigInt(limitBps)],
        value: parseETH(value)
      });

      const result = await sendTransaction({ transaction, account });
      const receipt = await waitForReceipt(result);
      
      return receipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account]);

  const redeem = useCallback(async (positionId: number, amountHN: string) => {
    if (!account) throw new Error("No account connected");

    try {
      setLoading(true);
      setError(null);

      const transaction = (prepareContractCall as any)({
        contract: hedgxVaultContract,
        method: "redeem",
        params: [BigInt(positionId), parseETH(amountHN)]
      });

      const result = await sendTransaction({ transaction, account });
      const receipt = await waitForReceipt(result);
      
      return receipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account]);

  const addVaultLiquidity = useCallback(async (amount: string) => {
    if (!account) throw new Error("No account connected");

    try {
      setLoading(true);
      setError(null);

      const transaction = (prepareContractCall as any)({
        contract: hedgxVaultContract,
        method: "addVaultLiquidity",
        value: parseETH(amount)
      });

      const result = await sendTransaction({ transaction, account });
      const receipt = await waitForReceipt(result);
      
      return receipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account]);

  return {
    loading,
    error,
    mintMarketLong,
    mintMarketShort,
    mintLimitLong,
    mintLimitShort,
    redeem,
    addVaultLiquidity
  };
}

// Hook for calculating HN price
export function useHNPrice() {
  const calculateHNPrice = useCallback(async (exposureAmount: string, side: Side, fixedRate: string) => {
    try {
      const price = await (readContract as any)({
        contract: hedgxVaultContract as any,
        method: "calculateHNPrice",
        params: [parseETH(exposureAmount), side, BigInt(fixedRate)]
      });
      return price;
    } catch (err) {
      throw new Error("Failed to calculate HN price");
    }
  }, []);

  const calculateHNPriceWithBuffer = useCallback(async (exposureAmount: string, side: Side, fixedRate: string) => {
    try {
      console.log("Calling calculateHNPriceWithBuffer with params:", {
        exposureAmount,
        side,
        fixedRate,
        parsedExposure: parseETH(exposureAmount).toString(),
        parsedRate: BigInt(fixedRate).toString()
      });
      
      const price = await (readContract as any)({
        contract: hedgxVaultContract as any,
        method: "calculateHNPriceWithBuffer",
        params: [parseETH(exposureAmount), side, BigInt(fixedRate)]
      });
      
      console.log("calculateHNPriceWithBuffer result:", price.toString());
      return price;
    } catch (err) {
      console.error("calculateHNPriceWithBuffer error:", err);
      console.error("Contract address:", hedgxVaultContract?.address);
      console.error("Contract ABI has function:", hedgxVaultContract?.abi?.some((item: any) => item.name === "calculateHNPriceWithBuffer"));
      throw new Error(`Failed to calculate HN price with buffer: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, []);

  const calculateTokenValue = useCallback(async (amountHN: string, side: Side, fixedRate: string) => {
    try {
      const value = await (readContract as any)({
        contract: hedgxVaultContract as any,
        method: "calculateTokenValue",
        params: [parseETH(amountHN), side, BigInt(fixedRate)]
      });
      return value;
    } catch (err) {
      throw new Error("Failed to calculate token value");
    }
  }, []);

  return { calculateHNPrice, calculateHNPriceWithBuffer, calculateTokenValue };
}

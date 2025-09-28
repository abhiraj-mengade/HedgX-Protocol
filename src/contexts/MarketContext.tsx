"use client";

import React, { createContext, useContext, ReactNode } from 'react';

interface MarketContextType {
  marketId: string | null;
  formatCurrency: (wei: bigint) => string;
  getCurrencySymbol: () => string;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children, marketId }: { children: ReactNode; marketId: string | null }) {
  // Handle array case from catch-all routes
  const actualMarketId = Array.isArray(marketId) ? marketId[0] : marketId;
  
  const formatCurrency = (wei: bigint): string => {
    if (actualMarketId === 'BTC-USDT') {
      return (Number(wei) / 1e18).toFixed(4) + " BTC";
    }
    // Default to ETH for all other markets
    return (Number(wei) / 1e18).toFixed(4) + " ETH";
  };

  const getCurrencySymbol = (): string => {
    if (actualMarketId === 'BTC-USDT') {
      return "BTC";
    }
    // Default to ETH for all other markets
    return "ETH";
  };

  return (
    <MarketContext.Provider value={{ marketId: actualMarketId, formatCurrency, getCurrencySymbol }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
}

"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CONTRACT_CONFIG } from '@/lib/config';

interface ChainContextType {
  selectedChainId: number;
  setSelectedChainId: (chainId: number) => void;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export function ChainProvider({ children }: { children: ReactNode }) {
  const [selectedChainId, setSelectedChainId] = useState(CONTRACT_CONFIG.CHAIN_ID);

  return (
    <ChainContext.Provider value={{ selectedChainId, setSelectedChainId }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  const context = useContext(ChainContext);
  if (context === undefined) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
}

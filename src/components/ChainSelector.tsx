"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Chain {
  id: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  color: string;
}

const CHAINS: Chain[] = [
  {
    id: 11155111,
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    color: "green"
  },
  {
    id: 1110001, // Citrea Testnet chain ID (placeholder)
    name: "Citrea Testnet",
    shortName: "Citrea",
    rpcUrl: "https://rpc.citrea.xyz", // Placeholder RPC
    color: "blue"
  },
  {
    id: 31, // Rootstock Testnet chain ID
    name: "Rootstock Testnet",
    shortName: "Rootstock",
    rpcUrl: "https://public-node.testnet.rsk.co",
    color: "orange"
  },
  {
    id: 296, // Hedera Testnet chain ID
    name: "Hedera Testnet",
    shortName: "Hedera",
    rpcUrl: "https://testnet.hashio.io/api", // Placeholder RPC
    color: "purple"
  }
];

interface ChainSelectorProps {
  selectedChainId: number;
  onChainChange: (chainId: number) => void;
}

export default function ChainSelector({ selectedChainId, onChainChange }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedChain = CHAINS.find(chain => chain.id === selectedChainId) || CHAINS[0];
  
  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "blue":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "orange":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "purple":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all duration-200 hover:opacity-80 ${getColorClasses(selectedChain.color)}`}
      >
        <span>{selectedChain.shortName}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 bg-background border border-[rgba(189,238,99,0.2)] rounded-lg shadow-lg z-20 min-w-[180px]">
            {CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onChainChange(chain.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg hover:bg-[rgba(189,238,99,0.1)] ${
                  chain.id === selectedChainId 
                    ? 'bg-[rgba(189,238,99,0.1)] text-[hsl(var(--primary))]' 
                    : 'text-[hsl(var(--foreground))]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    chain.color === 'green' ? 'bg-green-400' :
                    chain.color === 'blue' ? 'bg-blue-400' :
                    chain.color === 'orange' ? 'bg-orange-400' :
                    'bg-purple-400'
                  }`} />
                  <span>{chain.name}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

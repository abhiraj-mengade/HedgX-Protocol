"use client";

import { ConnectButton, darkTheme, useSwitchActiveWalletChain } from "thirdweb/react";
import { client } from "../client";
import { defineChain, sepolia } from "thirdweb/chains";
import { citrea_testnet, CONTRACT_CONFIG, hedera_testnet, rootstock_testnet } from "@/lib/config";
import ChainSelector from "@/components/ChainSelector";
import { useState } from "react";

export default function Header() {
  const [selectedChainId, setSelectedChainId] = useState(CONTRACT_CONFIG.CHAIN_ID);
  const switchChain = useSwitchActiveWalletChain();

  const handleChainChange = (chainId: number) => {
    setSelectedChainId(chainId);
    switchChain(defineChain({ id: chainId, testnet: true }));
    // You can add logic here to update the wallet connection or contract configuration
    // For now, we'll just update the local state
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 sticky top-0 bg-background h-16 z-20">
      <div className="flex items-center space-x-4">
        <h1 className="text-3xl font-bold text-primary tracking-tight font-outfit">
          HedgX<span className="text-foreground">.</span>
        </h1>
        <div className="hidden md:flex items-center space-x-2 text-sm">
          <ChainSelector
            selectedChainId={selectedChainId}
            onChainChange={handleChainChange}
          />
        </div>
      </div>
      <div>
        <ConnectButton
          theme={darkTheme({
            colors: {
              primaryButtonBg: "hsl(var(--primary))",
            },
          })}
          chains={[sepolia, rootstock_testnet, citrea_testnet, hedera_testnet]}
          connectButton={{
            label: "Connect",
            style: {
              height: "2.25rem",
              borderRadius: "0.5rem",
              fontSize: "16px",
              fontWeight: "500",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              paddingBottom: "0.5rem",
              paddingTop: "0.5rem",
            },
          }}
          client={client}
          appMetadata={{
            name: "HedgX Protocol",
            url: "https://hedgx-protocol.vercel.app",
          }}
          // chain={{
          //   id: CONTRACT_CONFIG.CHAIN_ID,
          //   rpc: CONTRACT_CONFIG.RPC_URLS[CONTRACT_CONFIG.CHAIN_ID as keyof typeof CONTRACT_CONFIG.RPC_URLS] || CONTRACT_CONFIG.RPC_URLS[11155111],
          // }}
        />
      </div>
    </header>
  );
}

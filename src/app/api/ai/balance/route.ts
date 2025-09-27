import { ethers } from "ethers";
import { NextResponse } from "next/server";

const ZG_RPC_URL = "https://evmrpc-testnet.0g.ai";

export async function GET() {
  try {
    const privateKey = process.env.ZG_PRIVATE_KEY;
    
    if (!privateKey || typeof privateKey !== 'string') {
      return NextResponse.json({ 
        error: "0G private key not configured",
        demo: true,
        balance: "1.0",
        locked: "0.0",
        available: "1.0"
      });
    }

    // Initialize 0G broker with dynamic import
    const { createZGComputeNetworkBroker } = await import("@0glabs/0g-serving-broker");
    const provider = new ethers.JsonRpcProvider(ZG_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const broker = await createZGComputeNetworkBroker(wallet);

    // Check if account exists, create if not
    try {
      const ledger = await broker.ledger.getLedger();
      
      // Handle the Result array structure
      const totalBalance = ledger[1] || BigInt(0);
      const locked = ledger[2] || BigInt(0);
      const available = totalBalance - locked;
      
      // Check if we need more funds for AI services
      const minRequired = ethers.parseEther("3.5");
      if (totalBalance < minRequired) {
        try {
          await broker.ledger.depositFund(3.5);
          
          // Get updated ledger
          const updatedLedger = await broker.ledger.getLedger();
          const newTotalBalance = updatedLedger[1] || BigInt(0);
          const newLocked = updatedLedger[2] || BigInt(0);
          const newAvailable = newTotalBalance - newLocked;
          
          return NextResponse.json({
            balance: ethers.formatEther(newTotalBalance),
            locked: ethers.formatEther(newLocked),
            available: ethers.formatEther(newAvailable),
            address: wallet.address,
            message: "Added 3.5 OG tokens for AI services"
          });
        } catch (depositError) {
          // Return current balance even if deposit failed
        }
      }
      
      return NextResponse.json({
        balance: ethers.formatEther(totalBalance),
        locked: ethers.formatEther(locked),
        available: ethers.formatEther(available),
        address: wallet.address
      });
    } catch (error: any) {
      if (error.reason === 'LedgerNotExists(address)') {
        try {
          // Create account with initial deposit
          await broker.ledger.addLedger(0.1);
          
          // Get the newly created ledger
          const ledger = await broker.ledger.getLedger();
          const totalBalance = ledger[1] || BigInt(0);
          const locked = ledger[2] || BigInt(0);
          const available = totalBalance - locked;
          
          return NextResponse.json({
            balance: ethers.formatEther(totalBalance),
            locked: ethers.formatEther(locked),
            available: ethers.formatEther(available),
            address: wallet.address,
            message: "New account created successfully"
          });
        } catch (createError) {
          return NextResponse.json({
            error: "Account creation failed",
            demo: true,
            balance: "1.0",
            locked: "0.0",
            available: "1.0",
            address: wallet.address
          });
        }
      }
      throw error;
    }

  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to get balance",
      demo: true,
      balance: "1.0",
      locked: "0.0",
      available: "1.0"
    });
  }
}
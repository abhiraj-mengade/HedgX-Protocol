import { ethers } from "ethers";

// Dynamic import for 0G broker to avoid SSR issues
let createZGComputeNetworkBroker: any = null;

if (typeof window !== "undefined") {
  import("@0glabs/0g-serving-broker").then((module) => {
    createZGComputeNetworkBroker = module.createZGComputeNetworkBroker;
  });
}

// 0G Network Configuration
const ZG_RPC_URL = "https://evmrpc-testnet.0g.ai";
const DEEPSEEK_PROVIDER_ADDRESS = "0x3feE5a4dd5Fdb8a32dDA97Bed899830605dBD9D3"; // deepseek-r1-70b

export interface ZGBrokerConfig {
  privateKey?: string;
  wallet?: ethers.Wallet;
  provider?: ethers.JsonRpcProvider;
}

export class ZGBrokerService {
  private broker: any;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private isInitialized = false;

  constructor(config?: ZGBrokerConfig) {
    this.provider = config?.provider || new ethers.JsonRpcProvider(ZG_RPC_URL);
    
    if (config?.wallet) {
      this.wallet = config.wallet;
    } else if (config?.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    } else {
      // Use environment variable for private key
      const privateKey = process.env.NEXT_PUBLIC_0G_KEY;
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      } else {
        // Fallback to demo wallet if no private key is provided
        const randomWallet = ethers.Wallet.createRandom();
        this.wallet = new ethers.Wallet(randomWallet.privateKey, this.provider);
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Wait for the dynamic import to complete
      if (!createZGComputeNetworkBroker) {
        await new Promise((resolve) => {
          const checkImport = () => {
            if (createZGComputeNetworkBroker) {
              resolve(true);
            } else {
              setTimeout(checkImport, 100);
            }
          };
          checkImport();
        });
      }

      this.broker = await createZGComputeNetworkBroker(this.wallet);
      this.isInitialized = true;
      console.log("0G Broker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize 0G Broker:", error);
      throw error;
    }
  }

  async fundAccount(amount: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      await this.broker.ledger.addLedger(amount);
      console.log(`Account funded with ${amount} OG tokens`);
    } catch (error) {
      console.error("Failed to fund account:", error);
      throw error;
    }
  }

  async getAccountBalance(): Promise<{
    balance: string;
    locked: string;
    available: string;
  }> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const ledger = await this.broker.ledger.getLedger();
      return {
        balance: ethers.formatEther(ledger.balance),
        locked: ethers.formatEther(ledger.locked),
        available: ethers.formatEther(ledger.balance - ledger.locked),
      };
    } catch (error) {
      console.error("Failed to get account balance:", error);
      throw error;
    }
  }

  async discoverServices(): Promise<any[]> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const services = await this.broker.inference.listService();
      console.log("Available services:", services);
      return services;
    } catch (error) {
      console.error("Failed to discover services:", error);
      throw error;
    }
  }

  async acknowledgeProvider(providerAddress: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      await this.broker.inference.acknowledgeProviderSigner(providerAddress);
      console.log(`Provider ${providerAddress} acknowledged`);
    } catch (error) {
      console.error("Failed to acknowledge provider:", error);
      throw error;
    }
  }

  async generateForecast(prompt: string): Promise<string> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // Acknowledge the DeepSeek provider
      await this.acknowledgeProvider(DEEPSEEK_PROVIDER_ADDRESS);
      
      // Get service metadata
      const { endpoint, model } = await this.broker.inference.getServiceMetadata(DEEPSEEK_PROVIDER_ADDRESS);
      
      // Generate auth headers
      const headers = await this.broker.inference.getRequestHeaders(DEEPSEEK_PROVIDER_ADDRESS, prompt);
      
      // Send request to DeepSeek
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          ...headers 
        },
        body: JSON.stringify({
          messages: [{ 
            role: "user", 
            content: `As a financial AI expert, analyze the following request and provide a detailed forecast: ${prompt}. Focus on short-term floating rates, market indicators, and provide confidence levels.`
          }],
          model: model,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const answer = data.choices[0].message.content;
      
      // Verify response if it's a verifiable service
      const valid = await this.broker.inference.processResponse(
        DEEPSEEK_PROVIDER_ADDRESS,
        answer,
        undefined // chatID - only for verifiable services
      );
      
      console.log("Response verification:", valid);
      
      return answer;
    } catch (error) {
      console.error("Failed to generate forecast:", error);
      throw error;
    }
  }

  async generateHedgingStrategy(userInvestments: string): Promise<string> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // Acknowledge the DeepSeek provider
      await this.acknowledgeProvider(DEEPSEEK_PROVIDER_ADDRESS);
      
      // Get service metadata
      const { endpoint, model } = await this.broker.inference.getServiceMetadata(DEEPSEEK_PROVIDER_ADDRESS);
      
      const prompt = `As a DeFi hedging expert, analyze this portfolio and provide optimized hedging strategies: ${userInvestments}. Consider funding rate swaps, options strategies, and risk management techniques.`;
      
      // Generate auth headers
      const headers = await this.broker.inference.getRequestHeaders(DEEPSEEK_PROVIDER_ADDRESS, prompt);
      
      // Send request to DeepSeek
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          ...headers 
        },
        body: JSON.stringify({
          messages: [{ 
            role: "user", 
            content: prompt
          }],
          model: model,
          max_tokens: 1200,
          temperature: 0.6,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const answer = data.choices[0].message.content;
      
      // Verify response if it's a verifiable service
      const valid = await this.broker.inference.processResponse(
        DEEPSEEK_PROVIDER_ADDRESS,
        answer,
        undefined // chatID - only for verifiable services
      );
      
      console.log("Response verification:", valid);
      
      return answer;
    } catch (error) {
      console.error("Failed to generate hedging strategy:", error);
      throw error;
    }
  }
}

// Singleton instance
let brokerInstance: ZGBrokerService | null = null;

export const getZGBroker = (config?: ZGBrokerConfig): ZGBrokerService => {
  if (!brokerInstance) {
    brokerInstance = new ZGBrokerService(config);
  }
  return brokerInstance;
};

// Helper function to parse AI responses into structured data
export const parseForecastResponse = (response: string): {
  prediction: string;
  confidence: number;
  timeframe: string;
  factors: string[];
} => {
  // This is a simplified parser - in production, you'd want more robust parsing
  const lines = response.split('\n').filter(line => line.trim());
  
  let prediction = "Rate forecast analysis completed";
  let confidence = 75;
  let timeframe = "30 days";
  let factors: string[] = [];
  
  // Try to extract structured information from the response
  lines.forEach(line => {
    if (line.toLowerCase().includes('prediction') || line.toLowerCase().includes('forecast')) {
      prediction = line.replace(/.*prediction[:\s]*/i, '').replace(/.*forecast[:\s]*/i, '');
    }
    if (line.toLowerCase().includes('confidence')) {
      const match = line.match(/(\d+)%/);
      if (match) confidence = parseInt(match[1]);
    }
    if (line.toLowerCase().includes('timeframe') || line.toLowerCase().includes('period')) {
      const match = line.match(/(\d+)\s*(days?|weeks?|months?)/i);
      if (match) timeframe = `${match[1]} ${match[2]}`;
    }
    if (line.includes('•') || line.includes('-') || line.match(/^\d+\./)) {
      factors.push(line.replace(/^[•\-\d\.\s]+/, '').trim());
    }
  });
  
  return { prediction, confidence, timeframe, factors };
};

export const parseHedgingResponse = (response: string): {
  strategy: string;
  riskReduction: number;
  recommendations: string[];
  expectedReturn: string;
} => {
  // This is a simplified parser - in production, you'd want more robust parsing
  const lines = response.split('\n').filter(line => line.trim());
  
  let strategy = "Dynamic hedging strategy";
  let riskReduction = 60;
  let expectedReturn = "8-12% annualized";
  let recommendations: string[] = [];
  
  // Try to extract structured information from the response
  lines.forEach(line => {
    if (line.toLowerCase().includes('strategy') || line.toLowerCase().includes('approach')) {
      strategy = line.replace(/.*strategy[:\s]*/i, '').replace(/.*approach[:\s]*/i, '');
    }
    if (line.toLowerCase().includes('risk') && line.toLowerCase().includes('reduction')) {
      const match = line.match(/(\d+)%/);
      if (match) riskReduction = parseInt(match[1]);
    }
    if (line.toLowerCase().includes('return') || line.toLowerCase().includes('yield')) {
      const match = line.match(/(\d+[-–]\d+%|\d+%)/);
      if (match) expectedReturn = match[0];
    }
    if (line.includes('•') || line.includes('-') || line.match(/^\d+\./)) {
      recommendations.push(line.replace(/^[•\-\d\.\s]+/, '').trim());
    }
  });
  
  return { strategy, riskReduction, recommendations, expectedReturn };
};

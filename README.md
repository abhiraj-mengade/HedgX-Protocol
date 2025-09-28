# HedgX Protocol

> **Decentralized funding rate derivatives with AI-powered forecasting and cross-chain hedging strategies**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-blue?style=for-the-badge&logo=ethereum)](https://hedgx-protocol.vercel.app)
[![Contract - Rootstock](https://img.shields.io/badge/Contract-Rootstock%20Testnet-green?style=for-the-badge&logo=bitcoin)](https://rootstock-testnet.blockscout.com/address/0x1Cb428080f2CD2C64f260eEd4DD9A04e274F3fCE?tab=contract)
[![Contract - Citrea](https://img.shields.io/badge/Contract-Citrea%20Testnet-orange?style=for-the-badge&logo=bitcoin)](https://repo.sourcify.dev/5115/0x1Cb428080f2CD2C64f260eEd4DD9A04e274F3fCE)

## 🚀 Overview

HedgX Protocol is a cutting-edge decentralized derivatives platform that enables users to trade funding rate/interest rate derivatives across multiple blockchain networks. Built with AI-powered insights and cross-chain compatibility, it provides traders with sophisticated hedging tools and market intelligence.

### ✨ Key Features

- **🔄 Cross-Chain Trading**: Support for Sepolia, Citrea, and Rootstock testnets
- **🤖 AI-Powered Forecasting**: Real-time rate predictions using 0G Compute Network
- **💎 No-Collateral System**: Capital-efficient trading without collateral requirements
- **📊 Dynamic Orderbook**: Real-time limit and market orders with spread calculation
- **⏰ Automated Settlement**: 8-hour epoch-based settlements with PnL accumulation
- **🔮 Oracle Integration**: Decentralized rate updates for accurate pricing
- **🎯 Smart Hedging**: AI-optimized hedging strategies for risk management

## 🏗️ Architecture

### Smart Contracts
- **HedgXVault**: Core contract managing positions, orders, and settlements
- **No-Collateral System**: Dynamic HN token pricing without collateral requirements
- **Cross-Chain Compatible**: Deployed on multiple networks with unified interface

### Frontend
- **Next.js + TypeScript**: Modern React-based trading interface
- **Thirdweb SDK**: Seamless wallet integration and contract interactions
- **Real-time Updates**: Live data feeds and dynamic UI components
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### AI Integration
- **0G Compute Network**: Server-side AI inference for market analysis
- **DeepSeek R1 70B**: Premium model for advanced rate forecasting
- **Llama 3.3 70B**: Cost-effective model for general predictions
- **Secure Processing**: Private key management with environment variables

## 🌐 Live Contracts

| Network | Contract Address | Explorer |
|---------|------------------|----------|
| **Rootstock Testnet** | `0x1Cb428080f2CD2C64f260eEd4DD9A04e274F3fCE` | [View on Blockscout](https://rootstock-testnet.blockscout.com/address/0x1Cb428080f2CD2C64f260eEd4DD9A04e274F3fCE?tab=contract) |
| **Citrea Testnet** | `0x1Cb428080f2CD2C64f260eEd4DD9A04e274F3fCE` | [View on Sourcify](https://repo.sourcify.dev/5115/0x1Cb428080f2CD2C64f260eEd4DD9A04e274F3fCE) |
| **Sepolia Testnet** | `TBD` | Coming Soon |

## 🎮 Demo

### Live Application
**[🚀 Try HedgX Protocol Now](https://hedgx-protocol.vercel.app)**

### Features to Explore
1. **Market Overview**: View live funding rates across different markets
2. **Trading Interface**: Execute long/short positions with real-time pricing
3. **AI Tools**: Get AI-powered rate forecasts and hedging strategies
4. **Cross-Chain**: Switch between Rootstock, Citrea, and Sepolia networks
5. **Position Management**: Track PnL and manage active positions

## 🛠️ Tech Stack

### Blockchain & Smart Contracts
- **Solidity 0.8.24**: Smart contract development
- **OpenZeppelin**: Security and access control libraries
- **EVM Compatible**: Works across multiple networks

### Frontend & Backend
- **Next.js 14**: Full-stack React framework
- **TypeScript**: Type-safe development
- **Thirdweb SDK**: Web3 integration and wallet management
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Modern UI components

### AI & Analytics
- **0G Compute Network**: Decentralized AI inference
- **DeepSeek R1 70B**: Advanced language model
- **Llama 3.3 70B**: Efficient prediction model
- **Recharts**: Data visualization and analytics

### Infrastructure
- **Vercel**: Deployment and hosting
- **Environment Variables**: Secure configuration management
- **Dynamic Imports**: Optimized bundle splitting

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask or compatible wallet
- Testnet tokens (for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/hedgx-protocol.git
cd hedgx-protocol

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Environment Setup

```bash
# Required environment variables
NEXT_PUBLIC_HEDGX_VAULT_ADDRESS=0x... # Sepolia contract
NEXT_PUBLIC_HEDGX_VAULT_ADDRESS_CITREA=0x... # Citrea contract  
NEXT_PUBLIC_HEDGX_VAULT_ADDRESS_RS=0x... # Rootstock contract
ZG_PRIVATE_KEY=0x... # 0G Network private key (optional)
```

## 📊 How It Works

### 1. Market Creation
- Markets are created for different asset pairs (BTC/USDT, ETH/USDT, etc.)
- Each market has configurable parameters and oracle integration

### 2. Position Opening
- Users can open long or short positions on funding rates
- No collateral required - positions are backed by HN tokens
- Dynamic pricing based on implied rates and market conditions

### 3. AI-Powered Insights
- Real-time rate forecasting using advanced AI models
- Hedging strategy recommendations
- Market sentiment analysis

### 4. Settlement & PnL
- Automated settlements every 8 hours
- PnL calculation based on rate differences
- Position liquidation when losses exceed token value

## 🎯 Use Cases

### For Traders
- **Hedging**: Protect against funding rate volatility
- **Speculation**: Profit from rate movements
- **Arbitrage**: Exploit rate differences across markets

### For Institutions
- **Risk Management**: Systematic hedging strategies
- **Portfolio Optimization**: AI-driven position sizing
- **Market Making**: Provide liquidity and earn spreads

## 🔒 Security

- **Audited Contracts**: Smart contracts follow security best practices
- **Access Controls**: Owner-only functions for critical operations
- **Reentrancy Protection**: OpenZeppelin security patterns
- **Oracle Integration**: Decentralized rate feeds


### Development Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **0G Compute Network** for AI inference capabilities
- **Rootstock** for Bitcoin sidechain integration
- **Citrea** for innovative blockchain architecture
- **Thirdweb** for Web3 development tools
- **OpenZeppelin** for security libraries

## 📞 Support

- **Documentation**: [docs.hedgx.io](https://docs.hedgx.io)
- **Discord**: [Join our community](https://discord.gg/hedgx)
- **Twitter**: [@HedgXProtocol](https://twitter.com/hedgxprotocol)
- **Email**: support@hedgx.io

---

**Built with ❤️ by the HedgX Protocol team**

*Empowering traders with AI-driven derivatives and cross-chain liquidity*
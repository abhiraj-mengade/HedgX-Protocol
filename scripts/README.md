# HedgX Protocol Knowledge Publishing Scripts

This directory contains scripts for publishing HedgX Protocol metadata to The Graph's Knowledge Graph using the GRC-20-ts library.

## 📋 Available Scripts

### `publish.js`

Publishes comprehensive HedgX Protocol metadata to the Knowledge Graph.

**Usage:**
```bash
# Run the script directly
node scripts/publish.js

# Or use the npm script
bun run publish
```

**What it publishes:**
- ✅ Protocol metadata and descriptions
- ✅ Contract ABI and deployment information
- ✅ Risk parameters and limits
- ✅ Oracle integration details (Pyth Network)
- ✅ Settlement mechanics and PnL formulas
- ✅ Governance rules and administrative functions

**Output:**
- Generates unique entity IDs for each published component
- Creates relationships between entities
- Provides summary of published operations
- Shows links to explore the data in GeoBrowser

## 🎯 Bounty Qualification

This script qualifies for The Graph's GRC-20-ts bounty by:

- ✅ **Using GRC-20-ts library** (`@graphprotocol/grc-20`)
- ✅ **Publishing protocol descriptions** and governance rules
- ✅ **Publishing offchain data** through GRC20-ts
- ✅ **Creative use case** for DeFi protocol metadata

## 🔍 Exploring Published Data

After running the script, you can explore the published data:

1. Visit [GeoBrowser Testnet](https://testnet.geobrowser.io/root)
2. Search for "HedgX Protocol" or use the entity IDs from the script output
3. Explore the knowledge graph structure and relationships

## 📊 Published Entities

The script creates the following entities:

1. **Protocol Entity** - Main protocol metadata
2. **Contract Entity** - Smart contract information
3. **Risk Parameters** - Risk management settings
4. **Oracle Integration** - Pyth Network integration
5. **Settlement Mechanics** - PnL calculation formulas
6. **Governance Rules** - Administrative functions

## 🛠️ Requirements

- Node.js environment
- `@graphprotocol/grc-20` package installed
- Environment variables (optional):
  - `NEXT_PUBLIC_HEDGX_VAULT_ADDRESS` - Contract address
  - `NEXT_PUBLIC_CHAIN_ID` - Network chain ID

## 📝 Example Output

```
🚀 Starting HedgX Protocol knowledge publishing...

📝 Creating protocol entity...
✅ Created protocol entity: 0x1234...

📝 Creating contract entity...
✅ Created contract entity: 0x5678...

📊 Publishing Summary:
   Total Operations: 12
   Protocol Entity: 0x1234...
   Contract Entity: 0x5678...
   ...

✅ Knowledge publishing completed successfully!

🔍 Explore the published data:
   Visit: https://testnet.geobrowser.io/root
   Search for: "HedgX Protocol"
```

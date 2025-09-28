import { privateKeyToAccount } from "viem/accounts";
import { Graph, Ipfs, getWalletClient } from "@graphprotocol/grc-20";

const addressPrivateKey = "0x3ab17f441439abbf5cf9c0cbde7520bbedd8400c6f028cf385e49ceb885ab6b9";
const { address } = privateKeyToAccount(addressPrivateKey);

// Take the address and enter it in Faucet to get some testnet ETH https://faucet.conduit.xyz/geo-test-zc16z3tcvf

const smartAccountWalletClient = await getWalletClient({
  privateKey: addressPrivateKey,
});

console.log("addressPrivateKey", addressPrivateKey);
console.log("address", address);
// console.log('smartAccountWalletClient', smartAccountWalletClient);

// Protocol metadata
const PROTOCOL_METADATA = {
  name: "HedgX Protocol",
  description:
    "ETH-only vault for leveraged funding rate exposure with epoch-based premium decay and automated settlement",
  version: "1.0.0",
  category: "DeFi",
  tags: ["funding-rates", "leverage", "vault", "ethereum", "defi"],
  website: "https://hedgx-protocol.vercel.app",
  github: "https://github.com/your-org/hedgx-protocol",
  documentation: "https://docs.hedgx-protocol.com",
};

// Contract information
const CONTRACT_INFO = {
  address:
    process.env.NEXT_PUBLIC_HEDGX_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000",
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111"),
  deploymentDate: new Date().toISOString(),
  verified: true,
};

const Ops = [];

async function createTypes() {
  console.log("📝 Creating entity types...");

  try {
    // Create DeFi Protocol type
    const protocolType = Graph.createType({
      name: "DeFi Protocol",
      description: "A decentralized finance protocol",
      properties: [],
    });

    // Create Smart Contract type
    const contractType = Graph.createType({
      name: "Smart Contract",
      description: "A smart contract on a blockchain",
      properties: [],
    });

    // Create Risk Parameters type
    const riskType = Graph.createType({
      name: "Risk Parameters",
      description: "Risk management parameters for a protocol",
      properties: [],
    });

    console.log(`✅ Created types: ${protocolType.id}, ${contractType.id}, ${riskType.id}`);

    return {
      protocolTypeId: protocolType.id,
      contractTypeId: contractType.id,
      riskTypeId: riskType.id,
      ops: [...protocolType.ops, ...contractType.ops, ...riskType.ops],
    };
  } catch (error) {
    console.error("❌ Error creating types:", error.message);
    throw error;
  }
}

async function createProtocolEntity(protocolTypeId) {
  console.log("📝 Creating HedgX Protocol entity...");

  try {
    // Create properties
    const nameProperty = Graph.createProperty({
      name: "Protocol Name",
      dataType: "STRING",
    });

    const descriptionProperty = Graph.createProperty({
      name: "Protocol Description",
      dataType: "STRING",
    });

    const versionProperty = Graph.createProperty({
      name: "Protocol Version",
      dataType: "STRING",
    });

    const categoryProperty = Graph.createProperty({
      name: "Protocol Category",
      dataType: "STRING",
    });

    const tagsProperty = Graph.createProperty({
      name: "Protocol Tags",
      dataType: "STRING",
    });

    const websiteProperty = Graph.createProperty({
      name: "Protocol Website",
      dataType: "STRING",
    });

    const githubProperty = Graph.createProperty({
      name: "Protocol GitHub",
      dataType: "STRING",
    });

    const documentationProperty = Graph.createProperty({
      name: "Protocol Documentation",
      dataType: "STRING",
    });

    // Create entity with values array
    const { id: protocolId, ops: createProtocolOps } = Graph.createEntity({
      name: PROTOCOL_METADATA.name,
      description: PROTOCOL_METADATA.description,
      types: [protocolTypeId],
      values: [
        {
          property: nameProperty.id,
          value: PROTOCOL_METADATA.name,
        },
        {
          property: descriptionProperty.id,
          value: PROTOCOL_METADATA.description,
        },
        {
          property: versionProperty.id,
          value: PROTOCOL_METADATA.version,
        },
        {
          property: categoryProperty.id,
          value: PROTOCOL_METADATA.category,
        },
        {
          property: tagsProperty.id,
          value: PROTOCOL_METADATA.tags.join(", "),
        },
        {
          property: websiteProperty.id,
          value: PROTOCOL_METADATA.website,
        },
        {
          property: githubProperty.id,
          value: PROTOCOL_METADATA.github,
        },
        {
          property: documentationProperty.id,
          value: PROTOCOL_METADATA.documentation,
        },
      ],
    });

    // Combine all operations
    const allOps = [
      ...nameProperty.ops,
      ...descriptionProperty.ops,
      ...versionProperty.ops,
      ...categoryProperty.ops,
      ...tagsProperty.ops,
      ...websiteProperty.ops,
      ...githubProperty.ops,
      ...documentationProperty.ops,
      ...createProtocolOps,
    ];

    console.log(`✅ Created protocol entity: ${protocolId}`);
    console.log(`📊 Generated ${allOps.length} operations`);

    return { protocolId, ops: allOps };
  } catch (error) {
    console.error("❌ Error creating protocol entity:", error.message);
    throw error;
  }
}

async function createContractEntity(contractTypeId) {
  console.log("📝 Creating HedgXVault Contract entity...");

  try {
    // Create properties
    const addressProperty = Graph.createProperty({
      name: "Contract Address",
      dataType: "STRING",
    });

    const chainIdProperty = Graph.createProperty({
      name: "Contract Chain ID",
      dataType: "NUMBER",
    });

    const deploymentProperty = Graph.createProperty({
      name: "Contract Deployment Date",
      dataType: "STRING",
    });

    const verifiedProperty = Graph.createProperty({
      name: "Contract Verified",
      dataType: "BOOLEAN",
    });

    const functionsProperty = Graph.createProperty({
      name: "Contract Functions",
      dataType: "STRING",
    });

    // Create entity
    const { id: contractId, ops: createContractOps } = Graph.createEntity({
      name: "HedgXVault Contract",
      description: "Main vault contract for HedgX Protocol with funding rate mechanics",
      types: [contractTypeId],
      values: [
        {
          property: addressProperty.id,
          value: CONTRACT_INFO.address,
        },
        {
          property: chainIdProperty.id,
          value: CONTRACT_INFO.chainId.toString(),
        },
        {
          property: deploymentProperty.id,
          value: CONTRACT_INFO.deploymentDate,
        },
        {
          property: verifiedProperty.id,
          value: CONTRACT_INFO.verified.toString(),
        },
        {
          property: functionsProperty.id,
          value:
            "mintMarketLong, mintMarketShort, mintLimitLong, mintLimitShort, redeem, settle, getImpliedRate, getOrderbookStatus",
        },
      ],
    });

    // Combine all operations
    const allOps = [
      ...addressProperty.ops,
      ...chainIdProperty.ops,
      ...deploymentProperty.ops,
      ...verifiedProperty.ops,
      ...functionsProperty.ops,
      ...createContractOps,
    ];

    console.log(`✅ Created contract entity: ${contractId}`);
    console.log(`📊 Generated ${allOps.length} operations`);

    return { contractId, ops: allOps };
  } catch (error) {
    console.error("❌ Error creating contract entity:", error.message);
    throw error;
  }
}

async function createRiskParametersEntity(riskTypeId) {
  console.log("📝 Creating Risk Parameters entity...");

  try {
    // Create properties
    const leverageProperty = Graph.createProperty({
      name: "Leverage Multiplier",
      dataType: "NUMBER",
    });

    const collateralProperty = Graph.createProperty({
      name: "Collateral Ratio",
      dataType: "NUMBER",
    });

    const maxExposureProperty = Graph.createProperty({
      name: "Max Exposure",
      dataType: "STRING",
    });

    const settlementProperty = Graph.createProperty({
      name: "Settlement Interval",
      dataType: "STRING",
    });

    const cycleProperty = Graph.createProperty({
      name: "Cycle Length",
      dataType: "STRING",
    });

    // Create entity
    const { id: riskId, ops: createRiskOps } = Graph.createEntity({
      name: "HedgX Risk Parameters",
      description: "Risk management parameters and limits for HedgX Protocol",
      types: [riskTypeId],
      values: [
        {
          property: leverageProperty.id,
          value: "5",
        },
        {
          property: collateralProperty.id,
          value: "0.2",
        },
        {
          property: maxExposureProperty.id,
          value: "1000 ETH",
        },
        {
          property: settlementProperty.id,
          value: "8 hours",
        },
        {
          property: cycleProperty.id,
          value: "30 days",
        },
      ],
    });

    // Combine all operations
    const allOps = [
      ...leverageProperty.ops,
      ...collateralProperty.ops,
      ...maxExposureProperty.ops,
      ...settlementProperty.ops,
      ...cycleProperty.ops,
      ...createRiskOps,
    ];

    console.log(`✅ Created risk parameters entity: ${riskId}`);
    console.log(`📊 Generated ${allOps.length} operations`);

    return { riskId, ops: allOps };
  } catch (error) {
    console.error("❌ Error creating risk parameters entity:", error.message);
    throw error;
  }
}
async function publishAllOps() {
  console.log("🚀 Starting HedgX Protocol knowledge publishing...\n");

  const { protocolTypeId, contractTypeId, riskTypeId, ops: typeOps } = await createTypes();

  const { protocolId, ops: protocolOps } = await createProtocolEntity(protocolTypeId);
  const { contractId, ops: contractOps } = await createContractEntity(contractTypeId);
  const { riskId, ops: riskOps } = await createRiskParametersEntity(riskTypeId);

  return {
    ops: [...typeOps, ...protocolOps, ...contractOps, ...riskOps],
    ids: [protocolId, contractId, riskId],
  };
}

const { ops, ids } = await publishAllOps();

const space = await Graph.createSpace({
  editorAddress: address,
  name: "hedgx-protocol-knowledge",
  network: "TESTNET",
});

console.log("space", space);
const spaceId = space.id;

console.log("ids", ids);

const { cid } = await Ipfs.publishEdit({
  name: "Edit name",
  ops,
  author: address,
});

console.log("cid", cid);

const result = await fetch(`${Graph.TESTNET_API_ORIGIN}/space/${spaceId}/edit/calldata`, {
  method: "POST",
  body: JSON.stringify({ cid }),
});

console.log("edit result", result);

const editResultJson = await result.json();
console.log("editResultJson", editResultJson);
const { to, data } = editResultJson;

console.log("to", to);
console.log("data", data);

const txResult = await smartAccountWalletClient.sendTransaction({
  // @ts-expect-error - TODO: fix the types error
  account: smartAccountWalletClient.account,
  to: to,
  value: 0n,
  data: data,
});

console.log("txResult", txResult);

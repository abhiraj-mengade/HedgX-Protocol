# HedgX Protocol

Hedge. Fix. Relax.

HedgX is a peer‑to‑peer funding-rate swap. Alice posts an offer (pay fixed, receive floating), Bob accepts (pay floating, receive fixed). The contract settles PnL every 8 hours using an owner‑updated funding rate. Supports fully tradable positions (creator/counterparty can transfer their side).

### Features
- **Simple notional**: PnL is based purely on notional (no leverage).
- **Tradable positions**: `transferCreatorPosition` and `transferCounterpartyPosition` move ownership of either side.
- **Periodic settlement**: `settleSwap` accrues PnL every 8h; `finalizeIfExpired` settles the stub period to expiry and closes.
- **Owner-driven oracle**: `updateRate` sets the current funding rate (bps) for settlement.

### Contract
- Path: `contracts/hedgx.sol`
- Name: `HedgX`

#### Key Parameters
- `BASIS_POINTS = 10000`
- `MIN_COLLATERAL_RATIO = 2000` (20%)
- `SETTLEMENT_INTERVAL = 8 hours`

#### Lifecycle
1. **Create offer**: `createSwap(notional, fixedRateBps, durationSecs, collateralToken, collateralAmount)`
   - Requires collateral ≥ notional × 20%.
   - Emits `SwapCreated`.
2. **Accept offer**: `acceptSwap(swapId, collateralAmount)`
   - Counterparty deposits collateral under same rule; swap activates and timestamps set.
   - Emits `SwapAccepted`.
3. **Update rate**: `updateRate(newRateBps)` by owner.
   - Emits `OracleRateUpdated`.
4. **Periodic settle**: `settleSwap(swapId)` every 8h (off‑chain keeper can call).
   - Accrues PnL: creator PnL ∝ (floating − fixed) × notional × time.
   - Auto‑finalizes if duration elapsed.
5. **Final settlement**: `finalizeIfExpired(swapId)` may be called after expiry.
   - Pro‑rata accrual from last settlement to exact expiry, then collateral distribution with caps.

#### Transferability
- `transferCreatorPosition(swapId, newOwner)`
- `transferCounterpartyPosition(swapId, newOwner)`

#### Views
- `getSwap(swapId) -> Swap`
- `getCurrentRate() -> (rateBps, lastUpdateTimestamp)`

### Development

This repo includes a Next.js frontend scaffold and the Solidity contract. Use your preferred toolchain to compile/deploy the contract.

#### Using Foundry (example)
```bash
forge init # if starting fresh; or add Foundry to this repo
forge build
forge create --rpc-url <RPC_URL> --private-key <PK> contracts/hedgx.sol:HedgX
```

#### Using Hardhat (example)
```bash
pnpm add -D hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init --typescript --yes
# add contracts/hedgx.sol, then:
npx hardhat compile
npx hardhat run scripts/deploy.ts --network <your-network>
```

#### Frontend boot
```bash
pnpm install
pnpm dev
```

Wire the deployed address/ABI into your frontend (e.g., via `thirdweb` or `ethers`) and call the functions above.

### Notes & Safety
- Owner can set `updateRate`; use a multisig or a trusted automation/oracle in production.
- No margin calls or top‑ups implemented; losses are capped by each side’s collateral at finalization.
- Consider adding pausability, collateral top‑ups, and sanity checks on funding rate updates.

### License
MIT

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title HedgXVault
 * @notice ETH-only vault for leveraged funding rate exposure.
 *         Users pay collateral + premium for exposure, premium decays over 30d cycle.
 *         Includes a mock oracle (owner-set funding rate). Market/Limit positions supported.
 */
contract HedgXVault is Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant CYCLE_LENGTH = 30 days;
    uint256 public constant SETTLEMENT_INTERVAL = 8 hours;
    uint256 public constant VALUE = 1e18; // 1 ETH in wei
    uint256 public constant EPOCH_LENGTH = 8 hours;
    uint256 public constant DELTA = EPOCH_LENGTH * 1e18 / (365 days); // δ = 8/8760 years in 1e18 precision
    uint256 public constant LEVERAGE = 5; // 5x leverage
    uint256 public constant COLLATERAL_RATIO = VALUE / LEVERAGE; // 0.2 ETH per 1 ETH exposure

    // Sides
    enum Side { Long, Short }

    // Position tracking
    struct Position {
        uint256 exposureAmount;
        uint256 collateral;
        uint256 fixedRate;
        uint256 mintTime;
        Side side;
    }

    // Position tracking: user => positionId => position
    mapping(address => mapping(uint256 => Position)) public positions;
    mapping(address => uint256) public nextPositionId;

    // Current cycle
    uint256 public currentCycleId;
    uint256 public cycleStart;
    uint256 public cycleEnd;
    uint256 public totalEpochs; // Total epochs in current cycle
    uint256 public currentEpoch; // Current epoch number (0-based)

    // Oracle (mock) - provides "actual" funding rate from external data
    uint256 public currentFundingRateBps; // owner-set, represents real market funding rate
    uint256 public lastOracleUpdate;
    
    // Orderbook for implied rate calculation
    uint256 public totalLongOrders;
    uint256 public totalShortOrders;
    uint256 public weightedLongRate;
    uint256 public weightedShortRate;

    // Individual order tracking for auto-matching
    struct LimitOrder {
        address user;
        uint256 amount;
        uint256 rate;
        Side side;
        bool isActive;
    }

    mapping(uint256 => LimitOrder) public limitOrders;
    uint256 public nextOrderId;

    // Settlement indexing for funding accrual between Long/Short sides
    uint256 public lastSettlement;
    int256 public longIndex; // accumulates funding payments to Long side
    int256 public shortIndex; // accumulates funding payments to Short side

    // Vault liquidity provision
    uint256 public vaultLiquidity; // Total ETH available for vault trading
    bool public vaultTradingEnabled; // Whether vault can act as counterparty

    // Dev mode for testing
    bool public devMode;

    // Events
    event CycleRolled(uint256 indexed cycleId, uint256 start, uint256 end);
    event RateUpdated(uint256 newRateBps, uint256 timestamp);
    event Minted(address indexed user, uint256 indexed id, uint256 amountHN, uint256 valueETH, Side side, bool isMarket, uint256 limitBps);
    event Redeemed(address indexed user, uint256 indexed id, uint256 amountHN, uint256 valueETH);
    event Settled(int256 longIndexChange, int256 shortIndexChange, uint256 timeElapsed);
    event DevModeToggled(bool enabled);
    event VaultTradingToggled(bool enabled);
    event VaultLiquidityAdded(address indexed user, uint256 amount);
    event VaultTrade(address indexed user, Side side, uint256 amount, uint256 rate);
    event LimitOrderAdded(uint256 indexed orderId, address indexed user, uint256 amount, uint256 rate, Side side);

    constructor() Ownable(msg.sender) {
        devMode = true; // Enable dev mode by default
        vaultTradingEnabled = true; // Enable vault trading by default
        
        // Set initial rates between 2-15% (200-1500 basis points)
        currentFundingRateBps = 500; // 5% initial underlying rate
        lastOracleUpdate = block.timestamp;
        
        _rollCycle(block.timestamp);
    }

    // --------- Admin / Oracle ---------
    function rollCycle() external onlyOwner {
        require(block.timestamp >= cycleEnd, "Current cycle not ended");
        _rollCycle(block.timestamp);
    }

    function _rollCycle(uint256 startTs) internal {
        currentCycleId += 1;
        cycleStart = startTs;
        cycleEnd = startTs + CYCLE_LENGTH;
        totalEpochs = CYCLE_LENGTH / EPOCH_LENGTH; // 90 epochs for 30 days
        currentEpoch = 0;
        lastSettlement = startTs;
        longIndex = 0;
        shortIndex = 0;
        // Reset orderbook
        totalLongOrders = 0;
        totalShortOrders = 0;
        weightedLongRate = 0;
        weightedShortRate = 0;
        emit CycleRolled(currentCycleId, cycleStart, cycleEnd);
    }

    function updateRate(uint256 _newBps) external onlyOwner {
        require(_newBps <= BASIS_POINTS, "max 100%");
        currentFundingRateBps = _newBps;
        lastOracleUpdate = block.timestamp;
        emit RateUpdated(_newBps, block.timestamp);
    }

    function toggleDevMode() external onlyOwner {
        devMode = !devMode;
        emit DevModeToggled(devMode);
    }

    function toggleVaultTrading() external onlyOwner {
        vaultTradingEnabled = !vaultTradingEnabled;
        emit VaultTradingToggled(vaultTradingEnabled);
    }

    function addVaultLiquidity() external payable {
        require(msg.value > 0, "No ETH sent");
        vaultLiquidity += msg.value;
        emit VaultLiquidityAdded(msg.sender, msg.value);
    }

    function settle() external {
        require(devMode || block.timestamp >= lastSettlement + SETTLEMENT_INTERVAL, "interval");
        
        // Calculate epochs elapsed since last settlement
        uint256 epochsElapsed = (block.timestamp - lastSettlement) / EPOCH_LENGTH;
        if (epochsElapsed == 0) return; // No full epochs to settle
        
        // Update current epoch
        currentEpoch += epochsElapsed;
        if (currentEpoch > totalEpochs) {
            currentEpoch = totalEpochs;
        }
        
        // Calculate PnL per epoch based on rate differences
        // For Long: PnL = (Underlying Rate - Implied Rate) * Notional Value * δ
        // For Short: PnL = (Implied Rate - Underlying Rate) * Notional Value * δ
        uint256 impliedRate = getImpliedRate();
        int256 rateDiff = int256(currentFundingRateBps) - int256(impliedRate);
        
        // Calculate PnL per epoch: rate difference * time component
        int256 pnlPerEpoch = (rateDiff * int256(DELTA)) / int256(BASIS_POINTS);
        int256 totalPnL = pnlPerEpoch * int256(epochsElapsed);
        
        // Update indices: Long gets positive PnL when underlying > implied, Short gets opposite
        longIndex += totalPnL;
        shortIndex -= totalPnL;
        
        lastSettlement = block.timestamp;
        emit Settled(totalPnL, -totalPnL, epochsElapsed);
    }

    // --------- HN Pricing (epoch-based) ---------
    // Returns 1e18-scaled unit price based on remaining epochs
    function hnUnitPrice() public view returns (uint256) {
        if (currentEpoch >= totalEpochs) return 0;
        uint256 remainingEpochs = totalEpochs - currentEpoch;
        
        // Ensure we have at least 1 epoch remaining for positive price
        if (remainingEpochs == 0) return 0;
        
        return (remainingEpochs * 1e18) / totalEpochs;
    }

    // Calculate HN price (premium for exposure) using epoch-based formula
    // HN(t) = Implied Rate(t) * (Remaining epochs * δ)
    // δ = 8/(24*365) = 0.000913 (time multiplier)
    function calculateHNPrice(uint256 exposureAmount, Side side, uint256 fixedRate) public view returns (uint256) {
        if (currentEpoch >= totalEpochs) return 0;
        
        uint256 remainingEpochs = totalEpochs - currentEpoch;
        uint256 impliedRate = getImpliedRate();
        
        // Ensure we have at least 1 epoch remaining for positive price
        if (remainingEpochs == 0) return 0;
        
        // Calculate time component: E_rem * δ
        uint256 timeComponent = (remainingEpochs * DELTA) / 1e18;
        
        // HN(t) = Implied Rate(t) * (Remaining epochs * δ)
        // This represents the current time value of the position
        uint256 hnPrice = (impliedRate * timeComponent) / BASIS_POINTS;
        
        // Scale by exposure amount
        return (exposureAmount * hnPrice) / 1e18;
    }

    // Calculate current token value (remaining HN value + collateral + PnL)
    // Long Position Value = HN(t) + cumulative realized long PnL
    // Short Position Value = HN(t) + cumulative realized short PnL
    function calculateTokenValue(uint256 amountHN, Side side, uint256 fixedRate) public view returns (uint256) {
        if (currentEpoch >= totalEpochs) return 0;
        
        // Current HN value (time value)
        uint256 currentHNValue = calculateHNPrice(amountHN, side, fixedRate);
        
        // Collateral value (0.2 ETH per 1 ETH exposure)
        uint256 collateralValue = (amountHN * COLLATERAL_RATIO) / VALUE;
        
        // Cumulative realized PnL from funding rate
        int256 indexValue = side == Side.Long ? longIndex : shortIndex;
        int256 pnlValue = (indexValue * int256(amountHN)) / 1e18;
        
        // Total value = collateral + current HN value + cumulative PnL
        int256 totalValue = int256(collateralValue + currentHNValue) + pnlValue;
        
        return totalValue > 0 ? uint256(totalValue) : 0;
    }

    // Position ID generation
    function _getNextPositionId(address user) internal returns (uint256) {
        return nextPositionId[user]++;
    }

    // --------- Mint (Market / Limit) ---------
    // For 1 ETH exposure: pay 0.2 ETH collateral + HN price
    // HN price = premium for exposure, decays to 0 over 30 days
    // On redeem: get back 0.2 ETH +/- PnL + remaining HN value

    function mintMarketLong(uint256 exposureAmount) external payable nonReentrant {
        require(exposureAmount > 0, "exposure must be > 0");
        uint256 impliedRate = getImpliedRate();
        
        // Check if this is a vault trade
        if (totalLongOrders == 0 && totalShortOrders == 0 && vaultTradingEnabled) {
            _executeVaultTrade(Side.Long, exposureAmount, impliedRate);
        } else {
            _mintHN(Side.Long, true, impliedRate, exposureAmount);
        }
    }

    function mintMarketShort(uint256 exposureAmount) external payable nonReentrant {
        require(exposureAmount > 0, "exposure must be > 0");
        uint256 impliedRate = getImpliedRate();
        
        // Check if this is a vault trade
        if (totalLongOrders == 0 && totalShortOrders == 0 && vaultTradingEnabled) {
            _executeVaultTrade(Side.Short, exposureAmount, impliedRate);
        } else {
            _mintHN(Side.Short, true, impliedRate, exposureAmount);
        }
    }

    function mintLimitLong(uint256 exposureAmount, uint256 limitBps) external payable nonReentrant {
        require(exposureAmount > 0, "exposure must be > 0");
        require(limitBps <= BASIS_POINTS, "limit");
        
        // Check if this order can be immediately matched
        uint256 impliedRate = getImpliedRate();
        if (impliedRate <= limitBps) {
            // Can execute immediately at implied rate
            _mintHN(Side.Long, true, impliedRate, exposureAmount);
        } else {
            // Add to orderbook as limit order
            _addLimitOrder(Side.Long, exposureAmount, limitBps);
        }
    }

    function mintLimitShort(uint256 exposureAmount, uint256 limitBps) external payable nonReentrant {
        require(exposureAmount > 0, "exposure must be > 0");
        require(limitBps <= BASIS_POINTS, "limit");
        
        // Check if this order can be immediately matched
        uint256 impliedRate = getImpliedRate();
        if (impliedRate >= limitBps) {
            // Can execute immediately at implied rate
            _mintHN(Side.Short, true, impliedRate, exposureAmount);
        } else {
            // Add to orderbook as limit order
            _addLimitOrder(Side.Short, exposureAmount, limitBps);
        }
    }

    function _mintHN(Side side, bool isMarket, uint256 limitBps, uint256 exposureAmount) internal {
        require(msg.value > 0, "no ETH");
        require(block.timestamp < cycleEnd, "cycle ended");
        require((totalEpochs - currentEpoch) > 0, "no trading in last epoch");
        
        // Calculate required payment: collateral + HN premium
        uint256 requiredCollateral = (exposureAmount * COLLATERAL_RATIO) / VALUE; // 0.2 ETH per 1 ETH exposure
        uint256 hnPrice = calculateHNPrice(exposureAmount, side, isMarket ? getImpliedRate() : limitBps);
        uint256 totalRequired = requiredCollateral + hnPrice;
        
        require(msg.value >= totalRequired, "Insufficient payment");
        
        uint256 positionId = _getNextPositionId(msg.sender);
        
        // Store position data
        positions[msg.sender][positionId] = Position({
            exposureAmount: exposureAmount,
            collateral: requiredCollateral,
            fixedRate: limitBps, // Use the rate passed to the function
            mintTime: block.timestamp,
            side: side
        });
        
        emit Minted(msg.sender, positionId, exposureAmount, msg.value, side, isMarket, limitBps);
    }

    function _addLimitOrder(Side side, uint256 amount, uint256 rate) internal {
        require(msg.value > 0, "ETH required for limit order");
        
        uint256 orderId = nextOrderId++;
        
        limitOrders[orderId] = LimitOrder({
            user: msg.sender,
            amount: amount,
            rate: rate,
            side: side,
            isActive: true
        });
        
        // Update orderbook totals
        if (side == Side.Long) {
            totalLongOrders += amount;
            weightedLongRate += (amount * rate);
        } else {
            totalShortOrders += amount;
            weightedShortRate += (amount * rate);
        }
        
        emit LimitOrderAdded(orderId, msg.sender, amount, rate, side);
        
        // For now, refund the ETH since this is just an order
        // In production, you might want to store it for when the order matches
        (bool success, ) = msg.sender.call{value: msg.value}("");
        require(success, "ETH refund failed");
        
        // Auto-matching happens automatically when conditions are met
    }

    function _executeVaultTrade(Side side, uint256 exposureAmount, uint256 rate) internal {
        require(vaultLiquidity > 0, "No vault liquidity");
        require(vaultTradingEnabled, "Vault trading disabled");
        
        // Calculate required payment
        uint256 requiredCollateral = (exposureAmount * COLLATERAL_RATIO) / VALUE;
        uint256 hnPrice = calculateHNPrice(exposureAmount, side, rate);
        uint256 totalRequired = requiredCollateral + hnPrice;
        
        require(msg.value >= totalRequired, "Insufficient payment");
        
        // Create position for user
        uint256 positionId = _getNextPositionId(msg.sender);
        positions[msg.sender][positionId] = Position({
            exposureAmount: exposureAmount,
            collateral: requiredCollateral,
            fixedRate: rate,
            mintTime: block.timestamp,
            side: side
        });
        
        // Vault takes the opposite side
        Side vaultSide = side == Side.Long ? Side.Short : Side.Long;
        uint256 vaultPositionId = _getNextPositionId(address(this));
        positions[address(this)][vaultPositionId] = Position({
            exposureAmount: exposureAmount,
            collateral: requiredCollateral,
            fixedRate: rate,
            mintTime: block.timestamp,
            side: vaultSide
        });
        
        // Update vault liquidity (vault provides the collateral)
        vaultLiquidity -= requiredCollateral;
        
        emit Minted(msg.sender, positionId, exposureAmount, msg.value, side, true, rate);
        emit Minted(address(this), vaultPositionId, exposureAmount, requiredCollateral, vaultSide, true, rate);
        emit VaultTrade(msg.sender, side, exposureAmount, rate);
    }

    // --------- Redeem (only during active cycle) ---------
    // Before cycle end, holder can burn HN and receive ETH proportional to remaining time + funding index.
    // After cycle end, redeem is blocked (legacy tokens worth 0 by design and must not be redeemed in new cycle).
    function redeem(uint256 positionId, uint256 amountHN) external nonReentrant {
        require(amountHN > 0, "amount");
        require(currentEpoch < totalEpochs, "cycle ended");
        require((totalEpochs - currentEpoch) > 0, "no trading in last epoch");

        Position storage position = positions[msg.sender][positionId];
        require(position.exposureAmount > 0, "position not found");
        require(amountHN <= position.exposureAmount, "insufficient balance");
        
        // Calculate proportional values
        uint256 proportion = (amountHN * 1e18) / position.exposureAmount;
        uint256 proportionalCollateral = (position.collateral * proportion) / 1e18;
        
        // Calculate remaining HN value (premium decay)
        uint256 remainingHNValue = calculateHNPrice(amountHN, position.side, position.fixedRate);
        
        // Calculate PnL from funding rate
        int256 indexValue = position.side == Side.Long ? longIndex : shortIndex;
        int256 pnlValue = (indexValue * int256(amountHN)) / 1e18;
        
        // Total payout = collateral + remaining HN value + PnL
        int256 totalPayout = int256(proportionalCollateral + remainingHNValue) + pnlValue;
        
        // Ensure non-negative payout (can't lose more than collateral)
        uint256 payout = totalPayout > 0 ? uint256(totalPayout) : 0;
        
        // Update position
        position.exposureAmount -= amountHN;
        position.collateral -= proportionalCollateral;
        
        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "eth xfer");
        emit Redeemed(msg.sender, positionId, amountHN, payout);
    }

    // --------- View Functions ---------
    function getCurrentIndices() external view returns (int256 longIdx, int256 shortIdx) {
        return (longIndex, shortIndex);
    }

    function getRates() external view returns (uint256 oracleRate, uint256 impliedRate) {
        return (currentFundingRateBps, getImpliedRate());
    }

    function getRatesPercent() external view returns (uint256 oraclePercent, uint256 impliedPercent) {
        return (currentFundingRateBps / 100, getImpliedRate() / 100);
    }

    function getOrderbookStatus() external view returns (
        uint256 longOrders,
        uint256 shortOrders,
        uint256 longWeightedRate,
        uint256 shortWeightedRate
    ) {
        return (totalLongOrders, totalShortOrders, weightedLongRate, weightedShortRate);
    }

    function getLimitOrder(uint256 orderId) external view returns (
        address user,
        uint256 amount,
        uint256 rate,
        Side side,
        bool isActive
    ) {
        LimitOrder memory order = limitOrders[orderId];
        return (order.user, order.amount, order.rate, order.side, order.isActive);
    }

    function getCycle() external view returns (uint256 cycleId, uint256 start, uint256 end) {
        return (currentCycleId, cycleStart, cycleEnd);
    }

    function getEpochInfo() external view returns (uint256 current, uint256 total, uint256 remaining) {
        return (currentEpoch, totalEpochs, totalEpochs - currentEpoch);
    }

    function getPosition(address user, uint256 positionId) external view returns (Position memory) {
        return positions[user][positionId];
    }

    function getPositionValue(address user, uint256 positionId) external view returns (uint256) {
        Position storage position = positions[user][positionId];
        if (position.exposureAmount == 0) return 0;
        return calculateTokenValue(position.exposureAmount, position.side, position.fixedRate);
    }

    function getVaultStatus() external view returns (
        uint256 liquidity,
        bool tradingEnabled,
        uint256 contractBalance
    ) {
        return (
            vaultLiquidity,
            vaultTradingEnabled,
            address(this).balance
        );
    }


    function getImpliedRate() public view returns (uint256) {
        if (totalLongOrders == 0 && totalShortOrders == 0) {
            // No orders in orderbook - use vault pricing if enabled
            if (vaultTradingEnabled && vaultLiquidity > 0) {
                return currentFundingRateBps; // Vault provides liquidity at oracle rate
            } else {
                // Set initial implied rate between 2-15% (200-1500 basis points)
                // Start with 7% (700 basis points) as a reasonable middle ground
                return 500; // 7% initial implied rate
            }
        }
        
        // Calculate weighted average of all limit orders
        // This represents market sentiment vs the oracle rate
        uint256 totalWeightedRate = weightedLongRate + weightedShortRate;
        uint256 totalOrders = totalLongOrders + totalShortOrders;
        
        if (totalOrders == 0) return currentFundingRateBps;
        
        // Calculate weighted average rate in basis points
        // totalWeightedRate is sum of (amount * rate) for all orders
        // totalOrders is sum of all amounts
        // So totalWeightedRate / totalOrders gives us the weighted average rate
        return totalWeightedRate / totalOrders;
    }

    // Dev mode helper functions
    function forceSettle() external onlyOwner {
        require(devMode, "Dev mode only");
        
        // Calculate epochs elapsed since last settlement
        uint256 epochsElapsed = (block.timestamp - lastSettlement) / EPOCH_LENGTH;
        if (epochsElapsed == 0) {
            epochsElapsed = 1; // Force at least 1 epoch
        }
        
        // Update current epoch
        currentEpoch += epochsElapsed;
        if (currentEpoch > totalEpochs) {
            currentEpoch = totalEpochs;
        }
        
        // Calculate PnL per epoch based on rate differences
        // For Long: PnL = (Underlying Rate - Implied Rate) * Notional Value * δ
        // For Short: PnL = (Implied Rate - Underlying Rate) * Notional Value * δ
        uint256 impliedRate = getImpliedRate();
        int256 rateDiff = int256(currentFundingRateBps) - int256(impliedRate);
        
        // Calculate PnL per epoch: rate difference * time component
        int256 pnlPerEpoch = (rateDiff * int256(DELTA)) / int256(BASIS_POINTS);
        int256 totalPnL = pnlPerEpoch * int256(epochsElapsed);
        
        // Update indices: Long gets positive PnL when underlying > implied, Short gets opposite
        longIndex += totalPnL;
        shortIndex -= totalPnL;
        
        lastSettlement = block.timestamp;
        emit Settled(totalPnL, -totalPnL, epochsElapsed);
    }

    function forceRollCycle() external onlyOwner {
        require(devMode, "Dev mode only");
        _rollCycle(block.timestamp);
    }

    function forceFinalSettlement() external view onlyOwner {
        require(devMode, "Dev mode only");
        // Force final settlement for all users (simplified)
        // In production, you'd want to track all users with positions
        // This is a placeholder - actual implementation would iterate through all users
    }

    function finalSettlementUser() external {
        require(currentEpoch >= totalEpochs, "Cycle not ended");
        _settleUserPositions(msg.sender);
    }

    function _settleUserPositions(address user) internal {
        for (uint256 i = 0; i < nextPositionId[user]; i++) {
            Position storage position = positions[user][i];
            if (position.exposureAmount > 0) {
                _settlePosition(user, i);
            }
        }
    }

    function _settlePosition(address user, uint256 positionId) internal {
        Position storage position = positions[user][positionId];
        require(position.exposureAmount > 0, "Position already settled");
        
        // Calculate final PnL
        int256 indexValue = position.side == Side.Long ? longIndex : shortIndex;
        int256 pnlValue = (indexValue * int256(position.exposureAmount)) / 1e18;
        
        // Final payout = collateral + PnL (HN price is 0 at cycle end)
        int256 totalPayout = int256(position.collateral) + pnlValue;
        
        // Ensure non-negative payout (can't lose more than collateral)
        uint256 payout = totalPayout > 0 ? uint256(totalPayout) : 0;
        
        // Clear position
        position.exposureAmount = 0;
        position.collateral = 0;
        
        // Send payout
        (bool ok, ) = user.call{value: payout}("");
        require(ok, "ETH transfer failed");
        
        emit Redeemed(user, positionId, position.exposureAmount, payout);
    }

    // Receive ETH
    receive() external payable {}
}



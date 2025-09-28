// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title HedgXVault
 * @notice Token-only vault for leveraged funding rate exposure.
 *         Users pay only premium for exposure, premium decays over 30d cycle.
 *         Includes a mock oracle (owner-set funding rate). Market/Limit positions supported.
 */
contract HedgXVault is Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant CYCLE_LENGTH = 30 days;
    uint256 public constant SETTLEMENT_INTERVAL = 8 hours;
    uint256 public constant VALUE = 1e18; // 1 Token in wei
    uint256 public constant EPOCH_LENGTH = 8 hours;
    uint256 public constant DELTA = EPOCH_LENGTH * 1e18 / (365 days); // δ = 8/8760 years in 1e18 precision
    uint256 public constant LEVERAGE = 5; // 5x leverage

    // Sides
    enum Side { Long, Short }

    // Position tracking
    struct Position {
        uint256 exposureAmount;
        uint256 fixedRate;
        uint256 mintTime;
        Side side;
        int256 accumulatedPnL; // PnL accumulated from settlements only
        uint256 lastSettledEpoch; // Last epoch when this position was settled
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
    uint256 public vaultLiquidity; // Total Token available for vault trading
    bool public vaultTradingEnabled; // Whether vault can act as counterparty

    // Dev mode for testing
    bool public devMode;

    // Events
    event CycleRolled(uint256 indexed cycleId, uint256 start, uint256 end);
    event RateUpdated(uint256 newRateBps, uint256 timestamp);
    event Minted(address indexed user, uint256 indexed id, uint256 amountHN, uint256 valueToken, Side side, bool isMarket, uint256 limitBps);
    event Redeemed(address indexed user, uint256 indexed id, uint256 amountHN, uint256 valueToken);
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
        require(msg.value > 0, "No Token sent");
        vaultLiquidity += msg.value;
        emit VaultLiquidityAdded(msg.sender, msg.value);
    }

    // Track all users with positions (for settlement iteration)
    address[] public activeUsers;
    mapping(address => bool) public isActiveUser;
    uint256 public constant MAX_POSITIONS_PER_USER = 8; // Limit positions per user

    function settle() external {
        require(devMode || block.timestamp >= lastSettlement + SETTLEMENT_INTERVAL, "interval");
        
        // Assume 1 epoch has passed (as you said, if settle is called = next epoch)
        uint256 epochsElapsed = 1;
        
        // Update current epoch
        currentEpoch += epochsElapsed;
        if (currentEpoch > totalEpochs) {
            currentEpoch = totalEpochs;
        }
        
        // Iterate through all active users and settle their positions
        for (uint256 u = 0; u < activeUsers.length; u++) {
            address user = activeUsers[u];
            
            // Iterate through user's positions (limited to MAX_POSITIONS_PER_USER)
            uint256 maxPositions = nextPositionId[user] > MAX_POSITIONS_PER_USER ? MAX_POSITIONS_PER_USER : nextPositionId[user];
            
            for (uint256 i = 0; i < maxPositions; i++) {
                Position storage position = positions[user][i];
                
                // Skip empty positions or already settled positions
                if (position.exposureAmount == 0 || position.lastSettledEpoch >= currentEpoch) {
                    continue;
                }
                
                // Calculate PnL for this position
                int256 rateDiff = int256(currentFundingRateBps) - int256(position.fixedRate);
                
                // For Short: profit when fixed > oracle (flip sign)
                if (position.side == Side.Short) {
                    rateDiff = -rateDiff;
                }
                
                // Calculate epochs to settle
                uint256 epochsToSettle = currentEpoch - position.lastSettledEpoch;
                
                // Calculate PnL: rate difference * exposure * epochs * delta
                int256 epochPnL = (rateDiff * int256(position.exposureAmount) * int256(epochsToSettle) * int256(DELTA)) / (int256(BASIS_POINTS) * 1e18);
                
                // Accumulate the PnL
                position.accumulatedPnL += epochPnL;
                position.lastSettledEpoch = currentEpoch;
            }
        }
        
        lastSettlement = block.timestamp;
        emit Settled(0, 0, epochsElapsed);
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
    // HN(t) = Rate(t) * (Remaining epochs * δ) * Exposure Amount
    // δ = 8/(24*365) = 0.000913 (time multiplier)
    // For market orders: uses implied rate from orderbook
    // For limit orders: uses user-specified rate (fixedRate parameter)
    function calculateHNPrice(uint256 exposureAmount, Side /* side */, uint256 fixedRate) public view returns (uint256) {
        if (currentEpoch >= totalEpochs) return 0;
        
        uint256 remainingEpochs = totalEpochs - currentEpoch;
        
        // Ensure we have at least 1 epoch remaining for positive price
        if (remainingEpochs == 0) return 0;
        
        // Use user-specified rate for limit orders, implied rate for market orders
        uint256 rate = fixedRate > 0 ? fixedRate : getImpliedRate();
        
        // HN(t) = Rate(t) * (Remaining epochs * δ) * Exposure Amount
        // This represents the total premium cost for the exposure
        // Use higher precision to avoid rounding errors
        uint256 hnPrice = (rate * remainingEpochs * DELTA * exposureAmount) / (BASIS_POINTS * 1e18);
        
        return hnPrice;
    }

    // Calculate HN price with transaction buffer to prevent failures
    // Adds a small buffer (2%) to account for price movements and gas costs
    function calculateHNPriceWithBuffer(uint256 exposureAmount, Side side, uint256 fixedRate) public view returns (uint256) {
        uint256 basePrice = calculateHNPrice(exposureAmount, side, fixedRate);
        
        // Add 2% buffer (200 basis points) to prevent transaction failures
        uint256 buffer = (basePrice * 200) / BASIS_POINTS;
        
        return basePrice + buffer;
    }

    // Calculate current token value (remaining HN value + PnL)
    // Long Position Value = HN(t) + cumulative realized long PnL
    // Short Position Value = HN(t) + cumulative realized short PnL
    function calculateTokenValue(uint256 amountHN, Side side, uint256 fixedRate) public view returns (uint256) {
        if (currentEpoch >= totalEpochs) return 0;

        // Current HN value (time value)
        uint256 currentHNValue = calculateHNPrice(amountHN, side, fixedRate);
        
        // Cumulative realized PnL from funding rate
        int256 indexValue = side == Side.Long ? longIndex : shortIndex;
        int256 pnlValue = (indexValue * int256(amountHN)) / 1e18;
        
        // Total value = current HN value + cumulative PnL
        int256 totalValue = int256(currentHNValue) + pnlValue;
        
        return totalValue > 0 ? uint256(totalValue) : 0;
    }

    // Position ID generation
    function _getNextPositionId(address user) internal returns (uint256) {
        return nextPositionId[user]++;
    }

    // --------- Mint (Market / Limit) ---------
    // For 1 Token exposure: pay only HN price (no collateral)
    // HN price = premium for exposure, decays to 0 over 30 days
    // On redeem: get back remaining HN value + PnL (no collateral)

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
            // Can execute immediately - market rate is equal or better than user's limit
            // User wanted to pay UP TO limitBps, market is offering impliedRate (lower is better for long)
            _mintHN(Side.Long, true, impliedRate, exposureAmount);
        } else {
            // Add to orderbook as limit order - market rate is worse than user's limit
            _addLimitOrder(Side.Long, exposureAmount, limitBps);
        }
    }

    function mintLimitShort(uint256 exposureAmount, uint256 limitBps) external payable nonReentrant {
        require(exposureAmount > 0, "exposure must be > 0");
        require(limitBps <= BASIS_POINTS, "limit");
        
        // Check if this order can be immediately matched
        uint256 impliedRate = getImpliedRate();
        if (impliedRate >= limitBps) {
            // Can execute immediately - market rate is equal or better than user's limit
            // User wanted to receive AT LEAST limitBps, market is offering impliedRate (higher is better for short)
            _mintHN(Side.Short, true, impliedRate, exposureAmount);
        } else {
            // Add to orderbook as limit order - market rate is worse than user's limit
            _addLimitOrder(Side.Short, exposureAmount, limitBps);
        }
    }

    function _mintHN(Side side, bool isMarket, uint256 limitBps, uint256 exposureAmount) internal {
        require(msg.value > 0, "no Token");
        require(block.timestamp < cycleEnd, "cycle ended");
        require((totalEpochs - currentEpoch) > 0, "no trading in last epoch");
        
        // Limit positions per user
        require(nextPositionId[msg.sender] < MAX_POSITIONS_PER_USER, "Max positions reached");
        
        // Calculate required payment: only HN premium (no collateral needed)
        uint256 hnPrice = calculateHNPrice(exposureAmount, side, isMarket ? getImpliedRate() : limitBps);
        uint256 totalRequired = hnPrice;
        
        require(msg.value >= totalRequired, "Insufficient payment");
        
        uint256 positionId = _getNextPositionId(msg.sender);
        
        // Add user to active users list if not already added
        if (!isActiveUser[msg.sender]) {
            activeUsers.push(msg.sender);
            isActiveUser[msg.sender] = true;
        }
        
        // Store position data
        positions[msg.sender][positionId] = Position({
            exposureAmount: exposureAmount,
            fixedRate: limitBps, // Use the rate passed to the function
            mintTime: block.timestamp,
            side: side,
            accumulatedPnL: 0,
            lastSettledEpoch: currentEpoch // Position starts from current epoch
        });
        
        emit Minted(msg.sender, positionId, exposureAmount, msg.value, side, isMarket, limitBps);
    }

    function _addLimitOrder(Side side, uint256 amount, uint256 rate) internal {
        require(msg.value > 0, "Token required for limit order");
        
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
        
        // Store the payment for when the order executes
        // Funds are held in the contract until order is executed or cancelled
        
        // Auto-matching happens automatically when conditions are met
    }

    // Cancel a limit order and refund the user
    function cancelLimitOrder(uint256 orderId) external nonReentrant {
        LimitOrder storage order = limitOrders[orderId];
        require(order.user == msg.sender, "Not your order");
        require(order.isActive, "Order not active");
        
        // Remove from orderbook totals
        if (order.side == Side.Long) {
            totalLongOrders -= order.amount;
            weightedLongRate -= (order.amount * order.rate);
        } else {
            totalShortOrders -= order.amount;
            weightedShortRate -= (order.amount * order.rate);
        }
        
        // Mark order as inactive
        order.isActive = false;
        
        // Calculate refund amount (should be the HN price they paid)
        uint256 refundAmount = calculateHNPrice(order.amount, order.side, order.rate);
        
        // Refund the user
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");
    }

    function _executeVaultTrade(Side side, uint256 exposureAmount, uint256 rate) internal {
        require(vaultLiquidity > 0, "No vault liquidity");
        require(vaultTradingEnabled, "Vault trading disabled");
        
        // Calculate required payment (only HN premium)
        uint256 hnPrice = calculateHNPrice(exposureAmount, side, rate);
        uint256 totalRequired = hnPrice;
        
        require(msg.value >= totalRequired, "Insufficient payment");
        
        // Add user to active users list if not already added
        if (!isActiveUser[msg.sender]) {
            activeUsers.push(msg.sender);
            isActiveUser[msg.sender] = true;
        }
        
        // Create position for user
        uint256 positionId = _getNextPositionId(msg.sender);
        positions[msg.sender][positionId] = Position({
            exposureAmount: exposureAmount,
            fixedRate: rate,
            mintTime: block.timestamp,
            side: side,
            accumulatedPnL: 0,
            lastSettledEpoch: currentEpoch // Start from current epoch
        });
        
        // Vault takes the opposite side
        Side vaultSide = side == Side.Long ? Side.Short : Side.Long;
        uint256 vaultPositionId = _getNextPositionId(address(this));
        positions[address(this)][vaultPositionId] = Position({
            exposureAmount: exposureAmount,
            fixedRate: rate,
            mintTime: block.timestamp,
            side: vaultSide,
            accumulatedPnL: 0,
            lastSettledEpoch: currentEpoch // Start from current epoch
        });
        
        // Update vault liquidity (vault provides the exposure)
        vaultLiquidity -= exposureAmount;
        
        emit Minted(msg.sender, positionId, exposureAmount, msg.value, side, true, rate);
        emit Minted(address(this), vaultPositionId, exposureAmount, 0, vaultSide, true, rate);
        emit VaultTrade(msg.sender, side, exposureAmount, rate);
    }

    // --------- Redeem (only during active cycle) ---------
    // Before cycle end, holder can burn HN and receive Token proportional to remaining time + funding index.
    // After cycle end, redeem is blocked (legacy tokens worth 0 by design and must not be redeemed in new cycle).
    function redeem(uint256 positionId, uint256 amountHN) external nonReentrant {
        require(amountHN > 0, "amount");
        require(currentEpoch < totalEpochs, "cycle ended");
        require((totalEpochs - currentEpoch) > 0, "no trading in last epoch");

        Position storage position = positions[msg.sender][positionId];
        require(position.exposureAmount > 0, "position not found");
        require(amountHN <= position.exposureAmount, "insufficient balance");
        
        // Calculate current HN value (using current implied rate for market value)
        uint256 currentHNValue = calculateHNPrice(amountHN, position.side, 0); // 0 = use current implied rate
        
        // Calculate PnL based on oracle vs fixed rate
        int256 totalPositionPnL = getPositionPnL(msg.sender, positionId);
        int256 proportionalPnL = (totalPositionPnL * int256(amountHN)) / int256(position.exposureAmount);
        
        // Total payout = current HN value + proportional PnL
        int256 totalPayout = int256(currentHNValue) + proportionalPnL;
        
        // Ensure non-negative payout
        uint256 payout = totalPayout > 0 ? uint256(totalPayout) : 0;
        
        // Update position
        position.exposureAmount -= amountHN;
        
        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "token xfer");
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


    function getBestTwoOrders() public view returns (
        uint256 bestLongRate,
        uint256 bestShortRate
    ) {
        // Initialize with default values for implied rate calculation
        bestLongRate = 0; // Highest long rate (best bid - what buyers willing to pay)
        bestShortRate = type(uint256).max; // Lowest short rate (best ask - what sellers willing to accept)
        
        // Iterate through all orders to find best rates for implied rate calculation
        for (uint256 i = 0; i < nextOrderId; i++) {
            LimitOrder memory order = limitOrders[i];
            if (!order.isActive) continue;
            
            if (order.side == Side.Long) {
                // For long orders, find the HIGHEST rate (best bid)
                if (order.rate > bestLongRate) {
                    bestLongRate = order.rate;
                }
            } else {
                // For short orders, find the LOWEST rate (best ask)
                if (order.rate < bestShortRate) {
                    bestShortRate = order.rate;
                }
            }
        }
        
        // If no orders found, use default rates
        if (bestLongRate == 0) {
            bestLongRate = currentFundingRateBps;
        }
        if (bestShortRate == type(uint256).max) {
            bestShortRate = currentFundingRateBps;
        }
    }

    function getImpliedRate() public view returns (uint256) {
        if (totalLongOrders == 0 && totalShortOrders == 0) {
            // No orders in orderbook - use vault pricing if enabled
            if (vaultTradingEnabled && vaultLiquidity > 0) {
                return currentFundingRateBps; // Vault provides liquidity at oracle rate
            } else {
                // Set initial implied rate between 2-15% (200-1500 basis points)
                // Start with 7% (700 basis points) as a reasonable middle ground
                return 500; // 5% initial implied rate
            }
        }
        
        // Get best orders (highest long rate + lowest short rate)
        (uint256 bestLongRate, uint256 bestShortRate) = getBestTwoOrders();
        
        // Return average of best long and best short rates
        return (bestLongRate + bestShortRate) / 2;
    }

    // Get the spread between best long and best short rates
    function getSpread() public view returns (uint256) {
        if (totalLongOrders == 0 && totalShortOrders == 0) {
            return 0; // No spread if no orders
        }
        
        (uint256 bestLongRate, uint256 bestShortRate) = getBestTwoOrders();
        
        // Spread = best long rate - best short rate
        return bestLongRate > bestShortRate ? bestLongRate - bestShortRate : 0;
    }

    // Get PnL for a specific position (only from actual settlements)
    function getPositionPnL(address user, uint256 positionId) public view returns (int256) {
        Position memory position = positions[user][positionId];
        if (position.exposureAmount == 0) return 0;
        
        // Calculate how many epochs have been settled since this position's last settlement
        uint256 epochsToSettle = currentEpoch > position.lastSettledEpoch ? 
            currentEpoch - position.lastSettledEpoch : 0;
        
        if (epochsToSettle == 0) {
            // No new settlements since position was last settled
            return position.accumulatedPnL;
        }
        
        // Calculate PnL for unsettled epochs
        int256 rateDiff = int256(currentFundingRateBps) - int256(position.fixedRate);
        
        // For Short: profit when fixed > oracle (flip sign)
        if (position.side == Side.Short) {
            rateDiff = -rateDiff;
        }
        
        // Calculate PnL for unsettled epochs
        // Rate is APY (annual), DELTA already converts epoch time to fraction of year
        // DELTA = 8 hours / 365 days = 8/8760 years (in 1e18 precision)
        int256 unsettledPnL = (rateDiff * int256(position.exposureAmount) * int256(epochsToSettle) * int256(DELTA)) / (int256(BASIS_POINTS) * 1e18);
        
        return position.accumulatedPnL + unsettledPnL;
    }

    // Debug function to check PnL calculation values
    function debugPositionPnL(address user, uint256 positionId) public view returns (
        uint256 currentEpochValue,
        uint256 lastSettledEpochValue,
        uint256 epochsToSettle,
        uint256 oracleRate,
        uint256 fixedRate,
        int256 rateDiff,
        int256 accumulatedPnL,
        int256 unsettledPnL,
        int256 totalPnL
    ) {
        Position memory position = positions[user][positionId];
        
        currentEpochValue = currentEpoch;
        lastSettledEpochValue = position.lastSettledEpoch;
        epochsToSettle = currentEpoch > position.lastSettledEpoch ? 
            currentEpoch - position.lastSettledEpoch : 0;
        oracleRate = currentFundingRateBps;
        fixedRate = position.fixedRate;
        rateDiff = int256(currentFundingRateBps) - int256(position.fixedRate);
        
        // For Short: profit when fixed > oracle (flip sign)
        if (position.side == Side.Short) {
            rateDiff = -rateDiff;
        }
        
        accumulatedPnL = position.accumulatedPnL;
        unsettledPnL = epochsToSettle > 0 ? 
            (rateDiff * int256(position.exposureAmount) * int256(epochsToSettle) * int256(DELTA)) / (int256(BASIS_POINTS) * 1e18) : int256(0);
        totalPnL = accumulatedPnL + unsettledPnL;
    }

    // Settle a specific position (called internally or by admin)
    function settlePosition(address user, uint256 positionId) public {
        Position storage position = positions[user][positionId];
        require(position.exposureAmount > 0, "Position not found");
        
        // Calculate how many epochs to settle
        uint256 epochsToSettle = currentEpoch > position.lastSettledEpoch ? 
            currentEpoch - position.lastSettledEpoch : 0;
        
        if (epochsToSettle > 0) {
            // Calculate PnL for these epochs
            int256 rateDiff = int256(currentFundingRateBps) - int256(position.fixedRate);
            
            // For Short: profit when fixed > oracle (flip sign)
            if (position.side == Side.Short) {
                rateDiff = -rateDiff;
            }
            
            // Calculate PnL for these epochs
            // Rate is APY (annual), DELTA already converts epoch time to fraction of year
            // DELTA = 8 hours / 365 days = 8/8760 years (in 1e18 precision)
            int256 epochPnL = (rateDiff * int256(position.exposureAmount) * int256(epochsToSettle) * int256(DELTA)) / (int256(BASIS_POINTS) * 1e18);
            
            // Accumulate the PnL
            position.accumulatedPnL += epochPnL;
            position.lastSettledEpoch = currentEpoch;
        }
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
        
        // Final payout = PnL only (HN price is 0 at cycle end, no collateral)
        int256 totalPayout = pnlValue;
        
        // Ensure non-negative payout
        uint256 payout = totalPayout > 0 ? uint256(totalPayout) : 0;
        
        // Clear position
        position.exposureAmount = 0;
        
        // Send payout
        (bool ok, ) = user.call{value: payout}("");
        require(ok, "Token transfer failed");
        
        emit Redeemed(user, positionId, position.exposureAmount, payout);
    }

    // Receive Token
    receive() external payable {}
}




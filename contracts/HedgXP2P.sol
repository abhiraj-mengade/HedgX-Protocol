// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/**
 * @title HedgXP2P - Simplified P2P Funding Rate Swap with Intent Transfers
 * @notice Peer-to-peer funding rate trading with simple intent-based position transfers
 * @dev Users post transfer intents; buyers call transfer functions to take positions.
 */
contract HedgXP2P is ReentrancyGuard, Ownable {

    // Events
    event SwapCreated(uint256 indexed swapId, address indexed creator, address indexed counterparty, uint256 notionalAmount, uint256 fixedRate, uint8 orderType, bool isLong, uint256 limitPriceBps, uint256 duration);
    event SwapAccepted(uint256 indexed swapId, address indexed acceptor);
    event SwapSettled(uint256 indexed swapId, int256 settlement);
    event SwapCancelled(uint256 indexed swapId);
    event OracleRateUpdated(uint256 newRate, uint256 timestamp);
    event HUTokensAllocated(uint256 indexed swapId, uint256 huAmount);
    event SwapsMatched(uint256 indexed makerSwapId, uint256 indexed takerSwapId, uint256 fixedRateBps);
    event TransferIntentPosted(uint256 indexed swapId, address indexed seller, bool isCreator, uint256 price);
    event PositionTransferred(uint256 indexed swapId, address indexed from, address indexed to, bool isCreator, uint256 price);
    event AllSwapsSettled(uint256 settledCount, uint256 finalizedCount);
    event CycleRolled(uint256 indexed cycleId, uint256 start, uint256 end);
    event DevModeToggled(bool enabled);

    // Structs
    enum OrderType { Market, Limit }
    enum Side { Long, Short }

    struct Swap {
        uint256 id;
        address creator;
        address counterparty;
        uint256 notionalAmount;
        uint256 fixedRate;
        OrderType orderType;
        Side side;
        uint256 limitPriceBps;
        uint256 huAllocated;
        uint256 startTime;
        uint256 duration;
        uint256 creatorCollateral;
        uint256 counterpartyCollateral;
        bool isActive;
        bool isSettled;
        uint256 lastSettlement;
        int256 accumulatedPnL;
    }

    // State variables
    mapping(uint256 => Swap) public swaps;
    uint256 public nextSwapId;
    uint256 public currentFundingRate;
    uint256 public lastOracleUpdate;
    uint256 public currentCycleId;
    uint256 public cycleStart;
    uint256 public cycleEnd;
    uint256 public lastSettlement;
    bool public devMode;

    // Transfer intents: swapId => (isCreator => (seller => price))
    mapping(uint256 => mapping(bool => mapping(address => uint256))) public transferIntents;

    // Constants
    uint256 public constant SETTLEMENT_INTERVAL = 8 hours;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_COLLATERAL_RATIO = 2000;
    uint256 public constant MAX_MATCH_SCAN = 50;
    uint256 public constant CYCLE_LENGTH = 30 days;

    constructor() Ownable(msg.sender) {
        currentFundingRate = 0;
        lastOracleUpdate = block.timestamp;
        lastSettlement = block.timestamp;
        devMode = true; // Enable dev mode by default
        _rollCycle(block.timestamp);
    }

    function _rollCycle(uint256 startTs) internal {
        currentCycleId += 1;
        cycleStart = startTs;
        cycleEnd = startTs + CYCLE_LENGTH;
        emit CycleRolled(currentCycleId, cycleStart, cycleEnd);
    }

    function rollCycle() external onlyOwner {
        require(block.timestamp >= cycleEnd, "Current cycle not ended");
        _rollCycle(block.timestamp);
    }

    function toggleDevMode() external onlyOwner {
        devMode = !devMode;
        emit DevModeToggled(devMode);
    }

    function updateRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 10000, "Rate cannot exceed 100%");
        currentFundingRate = _newRate;
        lastOracleUpdate = block.timestamp;
        emit OracleRateUpdated(_newRate, block.timestamp);
    }

    /**
     * @notice Create a funding rate swap position
     * @param _notionalAmount The notional amount (e.g., 1 ETH)
     * @param _orderType 0 = Market (current rate), 1 = Limit (specific rate)
     * @param _isLong true = Long position, false = Short position
     * @param _limitPriceBps Limit price in basis points (only for limit orders)
     * @dev All swaps mature at the end of the current 30-day cycle
     */
    function createSwap(
        uint256 _notionalAmount,
        uint8 _orderType,
        bool _isLong,
        uint256 _limitPriceBps
    ) external payable nonReentrant returns (uint256) {
        require(_notionalAmount > 0, "Notional amount must be positive");
        require(_orderType <= uint8(OrderType.Limit), "Invalid order type");
        require(_limitPriceBps <= 10000, "Price cannot exceed 100%");
        require(block.timestamp < cycleEnd, "Cannot create swap after cycle end");
        
        uint256 requiredCollateral = (_notionalAmount * MIN_COLLATERAL_RATIO) / BASIS_POINTS;
        require(msg.value >= requiredCollateral, "Insufficient ETH collateral");
        
        if (OrderType(_orderType) == OrderType.Market) {
            require(_limitPriceBps == 0, "Market order has no price");
        }
        
        uint256 swapId = nextSwapId++;
        swaps[swapId] = Swap({
            id: swapId,
            creator: msg.sender,
            counterparty: address(0),
            notionalAmount: _notionalAmount,
            fixedRate: 0,
            orderType: OrderType(_orderType),
            side: _isLong ? Side.Long : Side.Short,
            limitPriceBps: _limitPriceBps,
            huAllocated: 0,
            startTime: 0,
            duration: cycleEnd - block.timestamp, // Time remaining in current cycle
            creatorCollateral: msg.value,
            counterpartyCollateral: 0,
            isActive: false,
            isSettled: false,
            lastSettlement: 0,
            accumulatedPnL: 0
        });

        emit SwapCreated(swapId, msg.sender, address(0), _notionalAmount, 0, _orderType, _isLong, _limitPriceBps, cycleEnd - block.timestamp);
        _tryAutoMatch(swapId);
        return swapId;
    }

    function acceptSwap(uint256 _swapId) external payable nonReentrant {
        Swap storage swap = swaps[_swapId];
        require(swap.creator != address(0), "Swap does not exist");
        require(swap.counterparty == address(0), "Swap already accepted");
        require(swap.creator != msg.sender, "Cannot accept own swap");
        
        uint256 requiredCollateral = (swap.notionalAmount * MIN_COLLATERAL_RATIO) / BASIS_POINTS;
        require(msg.value >= requiredCollateral, "Insufficient ETH collateral");
        
        swap.counterparty = msg.sender;
        swap.counterpartyCollateral = msg.value;
        
        // Set fixed rate for the creator (the one who created the swap)
        if (swap.orderType == OrderType.Market) {
            swap.fixedRate = currentFundingRate;
        } else {
            swap.fixedRate = swap.limitPriceBps;
        }
        // Counterparty gets floating rate (current oracle rate, updated every 8h)
        
        swap.huAllocated = (swap.notionalAmount * swap.fixedRate) / BASIS_POINTS;
        swap.isActive = true;
        swap.startTime = block.timestamp;
        swap.lastSettlement = block.timestamp;

        emit HUTokensAllocated(_swapId, swap.huAllocated);
        emit SwapAccepted(_swapId, msg.sender);
    }

    function cancelSwap(uint256 _swapId) external nonReentrant {
        Swap storage swap = swaps[_swapId];
        require(swap.creator == msg.sender, "Only creator can cancel");
        require(swap.counterparty == address(0), "Cannot cancel accepted swap");

        (bool success, ) = swap.creator.call{value: swap.creatorCollateral}("");
        require(success, "ETH transfer failed");
        swap.isSettled = true;
        emit SwapCancelled(_swapId);
    }

    function settleSwap(uint256 _swapId) external nonReentrant {
        Swap storage swap = swaps[_swapId];
        require(swap.isActive, "Swap is not active");
        require(!swap.isSettled, "Swap already settled");
        require(devMode || block.timestamp >= swap.lastSettlement + SETTLEMENT_INTERVAL, "Settlement interval not reached");

        uint256 timeElapsed = block.timestamp - swap.lastSettlement;
        int256 settlement = _calculateSettlement(swap, timeElapsed);

        swap.accumulatedPnL += settlement;
        swap.lastSettlement = block.timestamp;

        if (block.timestamp >= cycleEnd) {
            _finalizeSwap(_swapId);
        }

        emit SwapSettled(_swapId, settlement);
    }

    function settleAllSwaps() external nonReentrant {
        require(devMode || block.timestamp >= lastSettlement + SETTLEMENT_INTERVAL, "Settlement interval not reached");
        _settleAllSwaps();
    }

    function _settleAllSwaps() internal {
        uint256 settledCount = 0;
        uint256 finalizedCount = 0;
        
        // Iterate through all swaps
        for (uint256 i = 0; i < nextSwapId; i++) {
            Swap storage swap = swaps[i];
            
            if (swap.isActive && !swap.isSettled) {
                uint256 timeElapsed = block.timestamp - swap.lastSettlement;
                int256 settlement = _calculateSettlement(swap, timeElapsed);
                
                swap.accumulatedPnL += settlement;
                swap.lastSettlement = block.timestamp;
                settledCount++;
                
                emit SwapSettled(i, settlement);
                
                // Finalize if cycle ended
                if (block.timestamp >= cycleEnd) {
                    _finalizeSwap(i);
                    finalizedCount++;
                }
            }
        }
        
        lastSettlement = block.timestamp;
        emit AllSwapsSettled(settledCount, finalizedCount);
    }

    function finalizeIfExpired(uint256 _swapId) external nonReentrant {
        Swap storage swap = swaps[_swapId];
        require(swap.isActive, "Swap is not active");
        require(!swap.isSettled, "Swap already settled");
        require(block.timestamp >= cycleEnd, "Cycle not ended");
        
        if (swap.lastSettlement < cycleEnd) {
            uint256 settlementUntil = cycleEnd;
            uint256 timeElapsed = settlementUntil - swap.lastSettlement;
            if (timeElapsed > 0) {
                int256 settlement = _calculateSettlement(swap, timeElapsed);
                swap.accumulatedPnL += settlement;
                swap.lastSettlement = settlementUntil;
                emit SwapSettled(_swapId, settlement);
            }
        }
        _finalizeSwap(_swapId);
    }

    // --------- Intent-based Position Transfers ---------
    function postTransferIntent(uint256 _swapId, bool _isCreator, uint256 _price) external {
        Swap storage swap = swaps[_swapId];
        require(!swap.isSettled, "Swap settled");
        require(swap.isActive, "Swap not active");
        
        if (_isCreator) {
            require(msg.sender == swap.creator, "Not creator");
        } else {
            require(msg.sender == swap.counterparty, "Not counterparty");
        }
        
        transferIntents[_swapId][_isCreator][msg.sender] = _price;
        emit TransferIntentPosted(_swapId, msg.sender, _isCreator, _price);
    }

    function buyPosition(uint256 _swapId, bool _isCreator, address _seller) external payable nonReentrant {
        Swap storage swap = swaps[_swapId];
        require(!swap.isSettled, "Swap settled");
        require(swap.isActive, "Swap not active");
        
        uint256 price = transferIntents[_swapId][_isCreator][_seller];
        require(price > 0, "No intent found");
        require(msg.value >= price, "Insufficient payment");
        
        // Clear the intent
        transferIntents[_swapId][_isCreator][_seller] = 0;
        
        // Transfer position
        if (_isCreator) {
            swap.creator = msg.sender;
        } else {
            swap.counterparty = msg.sender;
        }
        
        // Pay seller
        (bool success, ) = _seller.call{value: price}("");
        require(success, "Payment failed");
        
        // Refund excess
        if (msg.value > price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - price}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit PositionTransferred(_swapId, _seller, msg.sender, _isCreator, price);
    }


    function _calculateSettlement(Swap storage swap, uint256 timeElapsed) internal view returns (int256) {
        // Creator has fixed rate, counterparty has floating rate
        // Settlement = (floating_rate - fixed_rate) × notional × time
        int256 rateDiff = int256(currentFundingRate) - int256(swap.fixedRate);
        
        // For Long positions: positive rateDiff = Long pays Short (creator pays counterparty)
        // For Short positions: positive rateDiff = Short pays Long (counterparty pays creator)
        if (swap.side == Side.Short) {
            rateDiff = -rateDiff; // Invert for Short side
        }
        
        return (int256(swap.notionalAmount) * rateDiff * int256(timeElapsed)) / (int256(BASIS_POINTS) * int256(365 days));
    }

    function _computePayouts(Swap storage swap) internal view returns (uint256 creatorPayout, uint256 counterpartyPayout) {
        creatorPayout = swap.creatorCollateral;
        counterpartyPayout = swap.counterpartyCollateral;

        if (swap.accumulatedPnL > 0) {
            uint256 profit = uint256(swap.accumulatedPnL);
            if (profit <= swap.counterpartyCollateral) {
                unchecked {
                    creatorPayout += profit;
                    counterpartyPayout -= profit;
                }
            } else {
                creatorPayout += swap.counterpartyCollateral;
                counterpartyPayout = 0;
            }
        } else if (swap.accumulatedPnL < 0) {
            uint256 loss = uint256(-swap.accumulatedPnL);
            if (loss <= swap.creatorCollateral) {
                unchecked {
                    creatorPayout -= loss;
                    counterpartyPayout += loss;
                }
            } else {
                counterpartyPayout += swap.creatorCollateral;
                creatorPayout = 0;
            }
        }
    }

    function _finalizeSwap(uint256 _swapId) internal {
        Swap storage swap = swaps[_swapId];
        (uint256 creatorPayout, uint256 counterpartyPayout) = _computePayouts(swap);
        
        (bool creatorSuccess, ) = swap.creator.call{value: creatorPayout}("");
        require(creatorSuccess, "Creator payout failed");
        
        (bool counterpartySuccess, ) = swap.counterparty.call{value: counterpartyPayout}("");
        require(counterpartySuccess, "Counterparty payout failed");
        
        swap.isSettled = true;
        swap.isActive = false;
    }

    function _tryAutoMatch(uint256 _makerSwapId) internal {
        Swap storage maker = swaps[_makerSwapId];
        if (maker.counterparty != address(0) || maker.isSettled) {
            return;
        }
        
        // Look for candidates in both directions
        // First, look for candidates after the current swap
        for (uint256 i = _makerSwapId + 1; i < nextSwapId && (i - _makerSwapId) <= MAX_MATCH_SCAN; i++) {
            if (_tryMatchWithCandidate(_makerSwapId, i)) {
                return;
            }
        }
        
        // Then, look for candidates before the current swap
        for (uint256 i = _makerSwapId; i > 0 && (_makerSwapId - i + 1) <= MAX_MATCH_SCAN; i--) {
            if (_tryMatchWithCandidate(_makerSwapId, i - 1)) {
                return;
            }
        }
    }

    function _tryMatchWithCandidate(uint256 makerId, uint256 candidateId) internal returns (bool) {
        Swap storage maker = swaps[makerId];
        Swap storage candidate = swaps[candidateId];
        
        if (
            candidate.creator == address(0) ||
            candidate.counterparty != address(0) ||
            candidate.isSettled ||
            candidate.notionalAmount != maker.notionalAmount ||
            candidate.side == maker.side ||
            candidate.creator == maker.creator  // Prevent self-matching
        ) {
            return false;
        }

        uint256 resolvedRate = _resolveFixedRate(maker, candidate);
        require(resolvedRate <= BASIS_POINTS, "Rate too high");

        _activateSwap(makerId, candidateId, resolvedRate);
        return true;
    }

    function _activateSwap(uint256 makerId, uint256 candidateId, uint256 rate) internal {
        Swap storage maker = swaps[makerId];
        Swap storage candidate = swaps[candidateId];

        // Set up the maker swap (keep this one)
        maker.fixedRate = rate;
        maker.counterparty = candidate.creator;
        maker.counterpartyCollateral = candidate.creatorCollateral;
        maker.isActive = true;
        maker.startTime = block.timestamp;
        maker.lastSettlement = block.timestamp;
        maker.huAllocated = (maker.notionalAmount * rate) / BASIS_POINTS;

        // Mark candidate as consumed (like in acceptSwap)
        candidate.isSettled = true;
        candidate.isActive = false;
        candidate.creatorCollateral = 0;

        emit HUTokensAllocated(makerId, maker.huAllocated);
        emit SwapAccepted(makerId, maker.counterparty);
        emit SwapsMatched(makerId, candidateId, rate);
    }

    function _resolveFixedRate(Swap storage a, Swap storage b) internal view returns (uint256) {
        if (a.orderType == OrderType.Market && b.orderType == OrderType.Market) {
            return currentFundingRate;
        } else if (a.orderType == OrderType.Market && b.orderType == OrderType.Limit) {
            return b.limitPriceBps;
        } else if (a.orderType == OrderType.Limit && b.orderType == OrderType.Market) {
            return a.limitPriceBps;
        } else {
            require(a.limitPriceBps == b.limitPriceBps, "Limit prices differ");
            return a.limitPriceBps;
        }
    }

    function getSwap(uint256 _swapId) external view returns (Swap memory) {
        return swaps[_swapId];
    }

    function getCurrentRate() external view returns (uint256, uint256) {
        return (currentFundingRate, lastOracleUpdate);
    }

    function getCycle() external view returns (uint256, uint256, uint256) {
        return (currentCycleId, cycleStart, cycleEnd);
    }

    function getPositionValue(uint256 _swapId, address _user) external view returns (int256) {
        Swap storage swap = swaps[_swapId];
        require(swap.isActive, "Swap not active");
        
        // Calculate current PnL if not settled
        int256 currentPnL = swap.accumulatedPnL;
        if (!swap.isSettled) {
            uint256 timeElapsed = block.timestamp - swap.lastSettlement;
            int256 pendingSettlement = _calculateSettlement(swap, timeElapsed);
            currentPnL += pendingSettlement;
        }
        
        // Determine if user is creator or counterparty
        bool isCreator = (_user == swap.creator);
        bool isCounterparty = (_user == swap.counterparty);
        require(isCreator || isCounterparty, "User not in swap");
        
        // Return PnL from user's perspective
        // Positive = user profits, Negative = user loses
        if (isCreator) {
            return -currentPnL; // Creator's PnL is opposite of accumulated
        } else {
            return currentPnL; // Counterparty's PnL matches accumulated
        }
    }

    function getSwapSummary(uint256 _swapId) external view returns (
        address creator,
        address counterparty,
        uint256 notionalAmount,
        uint256 fixedRate,
        uint256 currentRate,
        int256 accumulatedPnL,
        int256 creatorPnL,
        int256 counterpartyPnL,
        uint256 creatorCollateral,
        uint256 counterpartyCollateral,
        bool isActive,
        bool isSettled
    ) {
        Swap storage swap = swaps[_swapId];
        
        // Calculate current PnL
        int256 currentPnL = swap.accumulatedPnL;
        if (!swap.isSettled && swap.isActive) {
            uint256 timeElapsed = block.timestamp - swap.lastSettlement;
            int256 pendingSettlement = _calculateSettlement(swap, timeElapsed);
            currentPnL += pendingSettlement;
        }
        
        return (
            swap.creator,
            swap.counterparty,
            swap.notionalAmount,
            swap.fixedRate,
            currentFundingRate,
            currentPnL,
            -currentPnL, // Creator's PnL
            currentPnL,  // Counterparty's PnL
            swap.creatorCollateral,
            swap.counterpartyCollateral,
            swap.isActive,
            swap.isSettled
        );
    }

    function isReadyForSettlement(uint256 _swapId) external view returns (bool) {
        Swap storage swap = swaps[_swapId];
        return swap.isActive && !swap.isSettled && (devMode || block.timestamp >= swap.lastSettlement + SETTLEMENT_INTERVAL);
    }

    // Dev mode helper functions
    function forceSettleAll() external onlyOwner {
        require(devMode, "Dev mode only");
        _settleAllSwaps();
    }

    function forceFinalizeAll() external onlyOwner {
        require(devMode, "Dev mode only");
        for (uint256 i = 0; i < nextSwapId; i++) {
            Swap storage swap = swaps[i];
            if (swap.isActive && !swap.isSettled) {
                _finalizeSwap(i);
            }
        }
    }

    receive() external payable {}
}

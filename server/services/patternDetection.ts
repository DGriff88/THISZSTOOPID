import { 
  type OHLCVCandles, 
  type InsertPatternSignal,
  type PatternSignal,
  PATTERN_TYPES,
  TIMEFRAMES
} from "@shared/schema";

type TimeframeType = typeof TIMEFRAMES[number];

// Pattern detection result interfaces
export interface PatternPoint {
  index: number;
  price: number;
  timestamp: Date;
  volume: number;
  isHigh: boolean;  // true for peaks, false for troughs
}

export interface SwingPoint extends PatternPoint {
  strength: number;  // Measure of how significant this swing is
  rejectionSize: number;  // Size of rejection from this level
}

export interface HeadAndShouldersResult {
  isDetected: boolean;
  confidence: number;  // 0-100
  patternType: 'head_shoulders_bearish' | 'head_shoulders_bullish';
  leftShoulder?: SwingPoint;
  head?: SwingPoint;
  rightShoulder?: SwingPoint;
  necklineLevel?: number;
  necklineSlope?: number;
  metadata: {
    preMoveSize: number;  // Size of move leading to pattern
    momentumChange: number;  // Measure of momentum change
    volumeConfirmation: boolean;  // Whether volume supports the pattern
    timespan: number;  // Duration of pattern in candles
    rejectionStrength: number;  // Average rejection strength
  };
}

export interface ReversalFlagResult {
  isDetected: boolean;
  confidence: number;  // 0-100
  patternType: 'reversal_flag_bearish' | 'reversal_flag_bullish';
  poleStart?: PatternPoint;
  poleEnd?: PatternPoint;
  flagStart?: PatternPoint;
  flagEnd?: PatternPoint;
  supportResistanceLevel?: number;
  breakoutLevel?: number;
  metadata: {
    poleSize: number;  // Size of the momentum move (pole)
    poleDuration: number;  // Duration of momentum phase in candles
    pullbackRatio: number;  // Ratio of pullbacks during pole phase (lower is better)
    consolidationDuration: number;  // Duration of sideways movement
    consolidationVolatility: number;  // Volatility during consolidation phase
    volumeDecline: boolean;  // Whether volume declined during consolidation
    supportResistanceStrength: number;  // Strength of the support/resistance level
    momentumLossConfirmed: boolean;  // Whether momentum loss is confirmed
    breakoutConfirmed: boolean;  // Whether breakout from flag is confirmed
  };
}

export interface ThreeLineStrikeResult {
  isDetected: boolean;
  confidence: number;  // 0-100
  patternType: 'three_line_strike_bearish' | 'three_line_strike_bullish';
  precedingStart?: PatternPoint;  // Start of preceding movement
  precedingEnd?: PatternPoint;    // End of preceding movement
  reversalCandle?: PatternPoint;  // The large reversal candle
  metadata: {
    precedingMovement: number;    // Size of movement in preceding 3-5 candles (%)
    reversalMovement: number;     // Size of reversal candle movement (%)
    negationRatio: number;        // How much of preceding movement is negated (0-1)
    precedingDuration: number;    // Number of candles in preceding movement
    momentumLossConfirmed: boolean;  // Whether momentum loss is detected
    volumeConfirmation: boolean;  // Volume supports the reversal
    candleStrength: number;       // Strength of the reversal candle
    momentumExhaustion: number;   // Measure of momentum exhaustion before reversal
    requiresConfirmation: boolean; // Always true - pattern shouldn't be used alone
  };
}

export interface TrapResult {
  isDetected: boolean;
  confidence: number;  // 0-100
  patternType: 'trap_bearish' | 'trap_bullish';
  breakoutStart?: PatternPoint;   // Start of the strong breakout move
  breakoutEnd?: PatternPoint;     // End of the breakout (fake out point)
  reversalStart?: PatternPoint;   // Start of the reversal
  reversalEnd?: PatternPoint;     // End of the reversal (current point)
  supportResistanceLevel?: number; // Nearby support/resistance level
  recentChopHigh?: number;        // High of recent consolidation broken
  recentChopLow?: number;         // Low of recent consolidation broken
  metadata: {
    breakoutStrength: number;     // Strength of breakout vs recent moves (%)
    breakoutVelocity: number;     // Velocity of breakout (price/time)
    reversalVelocity: number;     // Velocity of reversal (price/time)
    velocityRatio: number;        // Reversal velocity / breakout velocity
    timeToReversal: number;       // Candles between breakout end and reversal start
    breakoutDuration: number;     // Duration of breakout phase in candles
    reversalDuration: number;     // Duration of reversal phase in candles
    isBreakoutAbnormal: boolean;  // Whether breakout was stronger than normal trend
    isReversalImmediate: boolean; // Whether reversal happened immediately after breakout
    supportResistanceProximity: number; // Distance to nearest support/resistance (%)
    chopBreakConfirmed: boolean;  // Whether recent chop/consolidation was broken
    chopRange: number;            // Size of recent consolidation range (%)
  };
}

export interface ReversalCandlestickResult {
  isDetected: boolean;
  confidence: number;  // 0-100
  patternType: 'hammer_bullish' | 'hammer_bearish' | 'inverted_hammer_bullish' | 'inverted_hammer_bearish' | 
               'doji_reversal' | 'dragonfly_doji_bullish' | 'gravestone_doji_bearish' | 
               'bullish_engulfing' | 'bearish_engulfing' | 'shooting_star_bearish' | 'hanging_man_bearish' |
               'morning_star_bullish' | 'evening_star_bearish' | 'dark_cloud_cover_bearish' | 'piercing_pattern_bullish';
  candle?: PatternPoint;          // Primary reversal candle
  previousCandle?: PatternPoint;  // Previous candle for context (engulfing patterns)
  confirmationCandle?: PatternPoint; // Third candle for three-candle patterns
  supportResistanceLevel?: number; // Nearby support/resistance level
  metadata: {
    bodySize: number;             // Size of candle body relative to recent average (%)
    upperWickSize: number;        // Upper wick size relative to body (ratio)
    lowerWickSize: number;        // Lower wick size relative to body (ratio)
    rejectionStrength: number;    // Overall rejection strength (%)
    trendContext: 'uptrend' | 'downtrend' | 'sideways'; // Recent trend context
    supportResistanceProximity: number; // Distance to support/resistance (%)
    volumeConfirmation: boolean;  // Volume supports the pattern
    momentumExhaustion: number;   // Measure of momentum exhaustion (0-1)
    recentVolatility: number;     // Recent price volatility (%)
    candleStrength: number;       // Overall candle strength vs recent candles
    contextValidation: boolean;   // Pattern occurs at meaningful level
    patternCompleted: boolean;    // Pattern formation is complete
    requiresConfirmation: boolean; // Pattern needs confirmation from next candle
  };
}

export interface PatternDetectionConfig {
  minCandles: number;  // Minimum candles needed for detection
  lookbackPeriod: number;  // How far back to look for patterns
  minRejectionSize: number;  // Minimum rejection size as percentage
  volumeThreshold: number;  // Volume threshold for confirmation
  confidenceThreshold: number;  // Minimum confidence to trigger signal
  // Reversal Flag specific config
  minPoleSize: number;  // Minimum size of momentum move (pole) in percentage
  maxPullbackRatio: number;  // Maximum pullback ratio during pole phase
  minConsolidationDuration: number;  // Minimum consolidation duration in candles
  maxConsolidationDuration: number;  // Maximum consolidation duration in candles
  consolidationVolatilityThreshold: number;  // Maximum volatility during consolidation
  // Three Line Strike specific config
  minPrecedingMovement: number;  // Minimum preceding movement size in percentage
  maxPrecedingCandles: number;   // Maximum candles to look back for preceding movement
  minPrecedingCandles: number;   // Minimum candles to look back for preceding movement
  minReversalRatio: number;      // Minimum ratio of reversal to preceding movement
  minNegationRatio: number;      // Minimum ratio of movement that must be negated
  momentumExhaustionThreshold: number;  // Threshold for momentum exhaustion detection
  // Trap pattern specific config
  minBreakoutStrength: number;   // Minimum breakout strength vs recent moves (%)
  minReversalVelocityRatio: number;  // Minimum reversal velocity ratio (reversal/breakout)
  maxTimeToReversal: number;     // Maximum candles allowed between breakout and reversal
  minChopBreakSize: number;      // Minimum size of chop/consolidation break (%)
  maxSupportResistanceDistance: number;  // Maximum distance to support/resistance (%)
  minBreakoutDuration: number;   // Minimum duration of breakout phase in candles
  maxBreakoutDuration: number;   // Maximum duration of breakout phase in candles
  trendAnalysisPeriod: number;   // Period for analyzing recent trend strength
  chopDetectionPeriod: number;   // Period for detecting recent consolidation
  // Reversal Candlestick specific config
  minWickToBodyRatio: number;    // Minimum wick-to-body ratio for rejection patterns
  minBodySizeRatio: number;      // Minimum body size ratio vs recent average
  maxBodySizeRatio: number;      // Maximum body size ratio for doji patterns
  minRejectionSize: number;      // Minimum rejection size in percentage
  supportResistanceWindow: number; // Window for finding support/resistance levels
  trendContextPeriod: number;    // Period for determining trend context
  volumeSignificanceThreshold: number; // Volume threshold for significance
  dojiBodyThreshold: number;     // Maximum body size for doji identification (%)
  engulfingMinimumRatio: number; // Minimum engulfment ratio for engulfing patterns
}

export class HeadAndShouldersDetector {
  private config: PatternDetectionConfig;
  private recentSignals: Map<string, Date> = new Map(); // De-duplication tracking
  private readonly signalCooldownMs = 4 * 60 * 60 * 1000; // 4 hours cooldown

  constructor(config?: Partial<PatternDetectionConfig>) {
    this.config = {
      minCandles: 30,
      lookbackPeriod: 50,
      minRejectionSize: 2.0, // 2% minimum rejection
      volumeThreshold: 1.2, // 20% above average volume
      confidenceThreshold: 65.0, // 65% minimum confidence
      // Reversal Flag specific defaults
      minPoleSize: 5.0, // 5% minimum pole size
      maxPullbackRatio: 0.3, // Max 30% pullback during pole
      minConsolidationDuration: 5, // Min 5 candles consolidation
      maxConsolidationDuration: 20, // Max 20 candles consolidation
      consolidationVolatilityThreshold: 2.0, // Max 2% volatility during consolidation
      // Three Line Strike specific defaults
      minPrecedingMovement: 3.0, // 3% minimum preceding movement
      maxPrecedingCandles: 5, // Look back max 5 candles
      minPrecedingCandles: 3, // Look back min 3 candles
      minReversalRatio: 0.8, // Reversal candle must be 80% of preceding movement
      minNegationRatio: 0.7, // Must negate at least 70% of preceding movement
      momentumExhaustionThreshold: 0.4, // 40% momentum exhaustion threshold
      // Trap pattern specific defaults
      minBreakoutStrength: 2.0, // 2% minimum breakout strength vs recent moves
      minReversalVelocityRatio: 1.0, // Reversal must match breakout velocity
      maxTimeToReversal: 3, // Max 3 candles between breakout and reversal
      minChopBreakSize: 1.5, // 1.5% minimum chop break size
      maxSupportResistanceDistance: 3.0, // Max 3% distance to support/resistance
      minBreakoutDuration: 1, // Min 1 candle breakout duration
      maxBreakoutDuration: 5, // Max 5 candles breakout duration
      trendAnalysisPeriod: 20, // 20 candles for trend analysis
      chopDetectionPeriod: 15, // 15 candles for chop detection
      // Reversal Candlestick specific defaults
      minWickToBodyRatio: 2.0, // Minimum 2:1 wick-to-body ratio for rejection patterns
      minBodySizeRatio: 0.7, // Minimum 70% of recent average body size
      maxBodySizeRatio: 0.1, // Maximum 10% body size for doji patterns
      supportResistanceWindow: 20, // Look back 20 candles for support/resistance
      trendContextPeriod: 10, // 10 candles for trend context analysis
      volumeSignificanceThreshold: 1.3, // 30% above average volume
      dojiBodyThreshold: 0.1, // Maximum 0.1% body size for doji identification
      engulfingMinimumRatio: 1.0, // 100% minimum engulfment ratio
      ...config
    };
  }

  /**
   * Safely convert string to number with validation
   */
  private safeParseFloat(value: string | number): number {
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
      throw new Error(`Invalid numeric value: ${value}`);
    }
    return parsed;
  }

  /**
   * Generate unique key for signal de-duplication
   */
  private getSignalKey(symbol: string, patternType: string, timeframe: string): string {
    return `${symbol}-${patternType}-${timeframe}`;
  }

  /**
   * Check if signal should be filtered due to recent duplicate
   */
  private isDuplicateSignal(symbol: string, patternType: string, timeframe: string): boolean {
    const key = this.getSignalKey(symbol, patternType, timeframe);
    const lastSignalTime = this.recentSignals.get(key);
    
    if (!lastSignalTime) return false;
    
    const timeSinceLastSignal = Date.now() - lastSignalTime.getTime();
    return timeSinceLastSignal < this.signalCooldownMs;
  }

  /**
   * Record signal to prevent duplicates
   */
  private recordSignal(symbol: string, patternType: string, timeframe: string): void {
    const key = this.getSignalKey(symbol, patternType, timeframe);
    this.recentSignals.set(key, new Date());
  }

  /**
   * Validate OHLCV candle data
   */
  private validateCandle(candle: OHLCVCandles, index: number): void {
    try {
      const open = this.safeParseFloat(candle.open);
      const high = this.safeParseFloat(candle.high);
      const low = this.safeParseFloat(candle.low);
      const close = this.safeParseFloat(candle.close);
      const volume = candle.volume;
      
      if (high < low) {
        throw new Error(`High ${high} is less than low ${low}`);
      }
      if (close < low || close > high) {
        throw new Error(`Close ${close} is outside high-low range`);
      }
      if (volume < 0) {
        throw new Error(`Volume ${volume} is negative`);
      }
      // Note: Open can legitimately be outside high-low range due to market gaps
    } catch (error) {
      throw new Error(`Invalid candle data at index ${index}: ${error}`);
    }
  }

  /**
   * Check if price has broken through neckline
   */
  private checkNecklineBreak(
    candles: OHLCVCandles[],
    necklineLevel: number,
    patternEndIndex: number,
    isBearish: boolean
  ): { hasBreak: boolean; breakStrength: number } {
    const lookAheadPeriod = Math.min(5, candles.length - patternEndIndex - 1);
    let hasBreak = false;
    let maxBreakDistance = 0;
    
    for (let i = patternEndIndex + 1; i <= patternEndIndex + lookAheadPeriod; i++) {
      if (i >= candles.length) break;
      
      try {
        const close = this.safeParseFloat(candles[i].close);
        const low = this.safeParseFloat(candles[i].low);
        const high = this.safeParseFloat(candles[i].high);
        
        if (isBearish) {
          // For bearish pattern, look for break below neckline
          if (close < necklineLevel || low < necklineLevel) {
            hasBreak = true;
            const breakDistance = Math.abs(Math.min(close, low) - necklineLevel) / necklineLevel;
            maxBreakDistance = Math.max(maxBreakDistance, breakDistance);
          }
        } else {
          // For bullish pattern, look for break above neckline
          if (close > necklineLevel || high > necklineLevel) {
            hasBreak = true;
            const breakDistance = Math.abs(Math.max(close, high) - necklineLevel) / necklineLevel;
            maxBreakDistance = Math.max(maxBreakDistance, breakDistance);
          }
        }
      } catch (error) {
        console.warn(`Error checking neckline break at index ${i}: ${error}`);
        continue;
      }
    }
    
    return {
      hasBreak,
      breakStrength: maxBreakDistance * 100 // Convert to percentage
    };
  }

  /**
   * Main detection method that analyzes OHLCV data for Head and Shoulders patterns
   */
  async detectPatterns(
    candles: OHLCVCandles[], 
    strategyId: string,
    symbol: string,
    timeframe: TimeframeType
  ): Promise<InsertPatternSignal[]> {
    if (candles.length < this.config.minCandles) {
      return [];
    }

    // Validate input data
    try {
      for (let i = 0; i < candles.length; i++) {
        this.validateCandle(candles[i], i);
      }
    } catch (error) {
      console.error(`Candle validation failed: ${error}`);
      return [];
    }

    const detectedPatterns: InsertPatternSignal[] = [];
    
    // Sort candles by timestamp to ensure proper order
    const sortedCandles = [...candles].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Detect bearish patterns (peaks)
    const bearishResult = this.detectBearishPattern(sortedCandles);
    if (bearishResult.isDetected && 
        bearishResult.confidence >= this.config.confidenceThreshold &&
        !this.isDuplicateSignal(symbol, bearishResult.patternType, timeframe)) {
      const signal = this.createPatternSignal(
        bearishResult, 
        strategyId, 
        symbol, 
        timeframe, 
        sortedCandles
      );
      detectedPatterns.push(signal);
      this.recordSignal(symbol, bearishResult.patternType, timeframe);
    }

    // Detect bullish patterns (troughs)
    const bullishResult = this.detectBullishPattern(sortedCandles);
    if (bullishResult.isDetected && 
        bullishResult.confidence >= this.config.confidenceThreshold &&
        !this.isDuplicateSignal(symbol, bullishResult.patternType, timeframe)) {
      const signal = this.createPatternSignal(
        bullishResult, 
        strategyId, 
        symbol, 
        timeframe, 
        sortedCandles
      );
      detectedPatterns.push(signal);
      this.recordSignal(symbol, bullishResult.patternType, timeframe);
    }

    // Detect bearish reversal flag patterns
    const bearishFlagResult = this.detectBearishReversalFlag(sortedCandles);
    if (bearishFlagResult.isDetected && 
        bearishFlagResult.confidence >= this.config.confidenceThreshold &&
        !this.isDuplicateSignal(symbol, bearishFlagResult.patternType, timeframe)) {
      const signal = this.createReversalFlagSignal(
        bearishFlagResult, 
        strategyId, 
        symbol, 
        timeframe, 
        sortedCandles
      );
      detectedPatterns.push(signal);
      this.recordSignal(symbol, bearishFlagResult.patternType, timeframe);
    }

    // Detect bullish reversal flag patterns
    const bullishFlagResult = this.detectBullishReversalFlag(sortedCandles);
    if (bullishFlagResult.isDetected && 
        bullishFlagResult.confidence >= this.config.confidenceThreshold &&
        !this.isDuplicateSignal(symbol, bullishFlagResult.patternType, timeframe)) {
      const signal = this.createReversalFlagSignal(
        bullishFlagResult, 
        strategyId, 
        symbol, 
        timeframe, 
        sortedCandles
      );
      detectedPatterns.push(signal);
      this.recordSignal(symbol, bullishFlagResult.patternType, timeframe);
    }

    // Detect bearish Three Line Strike patterns
    const bearishStrikeResult = this.detectBearishThreeLineStrike(sortedCandles);
    if (bearishStrikeResult.isDetected && 
        bearishStrikeResult.confidence >= this.config.confidenceThreshold &&
        !this.isDuplicateSignal(symbol, bearishStrikeResult.patternType, timeframe)) {
      const signal = this.createThreeLineStrikeSignal(
        bearishStrikeResult, 
        strategyId, 
        symbol, 
        timeframe, 
        sortedCandles
      );
      detectedPatterns.push(signal);
      this.recordSignal(symbol, bearishStrikeResult.patternType, timeframe);
    }

    // Detect bullish Three Line Strike patterns
    const bullishStrikeResult = this.detectBullishThreeLineStrike(sortedCandles);
    if (bullishStrikeResult.isDetected && 
        bullishStrikeResult.confidence >= this.config.confidenceThreshold &&
        !this.isDuplicateSignal(symbol, bullishStrikeResult.patternType, timeframe)) {
      const signal = this.createThreeLineStrikeSignal(
        bullishStrikeResult, 
        strategyId, 
        symbol, 
        timeframe, 
        sortedCandles
      );
      detectedPatterns.push(signal);
      this.recordSignal(symbol, bullishStrikeResult.patternType, timeframe);
    }

    // Detect bearish trap patterns
    const bearishTrapResult = this.detectBearishTrap(sortedCandles);
    if (bearishTrapResult.isDetected && 
        bearishTrapResult.confidence >= this.config.confidenceThreshold &&
        !this.isDuplicateSignal(symbol, bearishTrapResult.patternType, timeframe)) {
      const signal = this.createTrapSignal(
        bearishTrapResult, 
        strategyId, 
        symbol, 
        timeframe, 
        sortedCandles
      );
      detectedPatterns.push(signal);
      this.recordSignal(symbol, bearishTrapResult.patternType, timeframe);
    }

    // Detect bullish trap patterns
    const bullishTrapResult = this.detectBullishTrap(sortedCandles);
    if (bullishTrapResult.isDetected && 
        bullishTrapResult.confidence >= this.config.confidenceThreshold &&
        !this.isDuplicateSignal(symbol, bullishTrapResult.patternType, timeframe)) {
      const signal = this.createTrapSignal(
        bullishTrapResult, 
        strategyId, 
        symbol, 
        timeframe, 
        sortedCandles
      );
      detectedPatterns.push(signal);
      this.recordSignal(symbol, bullishTrapResult.patternType, timeframe);
    }

    // Detect reversal candlestick patterns
    const reversalCandlestickResults = this.detectReversalCandlestickPatterns(sortedCandles);
    for (const candlestickResult of reversalCandlestickResults) {
      if (candlestickResult.isDetected && 
          candlestickResult.confidence >= this.config.confidenceThreshold &&
          !this.isDuplicateSignal(symbol, candlestickResult.patternType, timeframe)) {
        const signal = this.createReversalCandlestickSignal(
          candlestickResult, 
          strategyId, 
          symbol, 
          timeframe, 
          sortedCandles
        );
        detectedPatterns.push(signal);
        this.recordSignal(symbol, candlestickResult.patternType, timeframe);
      }
    }

    return detectedPatterns;
  }

  /**
   * Detect bearish Head and Shoulders pattern (three peaks)
   * Focus on momentum change and rejection size per Riley's specs
   */
  private detectBearishPattern(candles: OHLCVCandles[]): HeadAndShouldersResult {
    const peaks = this.findSignificantPeaks(candles);
    
    if (peaks.length < 3) {
      return { 
        isDetected: false, 
        confidence: 0, 
        patternType: 'head_shoulders_bearish',
        metadata: this.createEmptyMetadata()
      };
    }

    // Find the best combination of 3 peaks for Head and Shoulders
    for (let i = 0; i < peaks.length - 2; i++) {
      for (let j = i + 1; j < peaks.length - 1; j++) {
        for (let k = j + 1; k < peaks.length; k++) {
          const leftShoulder = peaks[i];
          const head = peaks[j];
          const rightShoulder = peaks[k];

          const result = this.analyzeBearishPattern(
            candles,
            leftShoulder,
            head,
            rightShoulder
          );

          if (result.isDetected) {
            return result;
          }
        }
      }
    }

    return { 
      isDetected: false, 
      confidence: 0, 
      patternType: 'head_shoulders_bearish',
      metadata: this.createEmptyMetadata()
    };
  }

  /**
   * Detect bullish Head and Shoulders pattern (three troughs)
   */
  private detectBullishPattern(candles: OHLCVCandles[]): HeadAndShouldersResult {
    const troughs = this.findSignificantTroughs(candles);
    
    if (troughs.length < 3) {
      return { 
        isDetected: false, 
        confidence: 0, 
        patternType: 'head_shoulders_bullish',
        metadata: this.createEmptyMetadata()
      };
    }

    // Find the best combination of 3 troughs for inverted Head and Shoulders
    for (let i = 0; i < troughs.length - 2; i++) {
      for (let j = i + 1; j < troughs.length - 1; j++) {
        for (let k = j + 1; k < troughs.length; k++) {
          const leftShoulder = troughs[i];
          const head = troughs[j];
          const rightShoulder = troughs[k];

          const result = this.analyzeBullishPattern(
            candles,
            leftShoulder,
            head,
            rightShoulder
          );

          if (result.isDetected) {
            return result;
          }
        }
      }
    }

    return { 
      isDetected: false, 
      confidence: 0, 
      patternType: 'head_shoulders_bullish',
      metadata: this.createEmptyMetadata()
    };
  }

  /**
   * Analyze potential bearish Head and Shoulders pattern
   * Implements Riley Coleman's focus on momentum change and rejection size
   */
  private analyzeBearishPattern(
    candles: OHLCVCandles[],
    leftShoulder: SwingPoint,
    head: SwingPoint,
    rightShoulder: SwingPoint
  ): HeadAndShouldersResult {
    // Riley's rule: Head should be higher than both shoulders
    if (head.price <= leftShoulder.price || head.price <= rightShoulder.price) {
      return { 
        isDetected: false, 
        confidence: 0, 
        patternType: 'head_shoulders_bearish',
        metadata: this.createEmptyMetadata()
      };
    }

    // Calculate neckline (connect the lows between shoulders and head)
    const leftNeckLow = this.findLowestBetween(candles, leftShoulder.index, head.index);
    const rightNeckLow = this.findLowestBetween(candles, head.index, rightShoulder.index);
    
    if (!leftNeckLow || !rightNeckLow) {
      return { 
        isDetected: false, 
        confidence: 0, 
        patternType: 'head_shoulders_bearish',
        metadata: this.createEmptyMetadata()
      };
    }

    const necklineLevel = (leftNeckLow.price + rightNeckLow.price) / 2;
    const necklineSlope = (rightNeckLow.price - leftNeckLow.price) / 
      (rightNeckLow.index - leftNeckLow.index);
      
    // Check for neckline break confirmation
    const necklineBreak = this.checkNecklineBreak(
      candles, 
      necklineLevel, 
      rightShoulder.index, 
      true // isBearish
    );

    // Riley's key factors: Large move + larger than normal rejection
    const preMoveSize = this.calculatePreMoveSize(candles, leftShoulder.index);
    const momentumChange = this.calculateMomentumChange(candles, head.index, rightShoulder.index);
    const rejectionStrength = (head.rejectionSize + rightShoulder.rejectionSize) / 2;
    
    // Volume confirmation
    const volumeConfirmation = this.checkVolumeConfirmation(candles, [
      leftShoulder.index, head.index, rightShoulder.index
    ]);

    // Calculate confidence based on Riley's criteria
    let confidence = this.calculateBearishConfidence({
      preMoveSize,
      momentumChange,
      rejectionStrength,
      volumeConfirmation,
      headHeight: head.price - necklineLevel,
      shoulderBalance: Math.abs(leftShoulder.price - rightShoulder.price) / head.price,
      timespan: rightShoulder.index - leftShoulder.index,
      necklineBreak: necklineBreak
    });

    const metadata = {
      preMoveSize,
      momentumChange,
      volumeConfirmation,
      timespan: rightShoulder.index - leftShoulder.index,
      rejectionStrength,
      necklineBreakConfirmed: necklineBreak.hasBreak,
      necklineBreakStrength: necklineBreak.breakStrength
    };

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType: 'head_shoulders_bearish',
      leftShoulder,
      head,
      rightShoulder,
      necklineLevel,
      necklineSlope,
      metadata
    };
  }

  /**
   * Analyze potential bullish Head and Shoulders pattern (inverted)
   */
  private analyzeBullishPattern(
    candles: OHLCVCandles[],
    leftShoulder: SwingPoint,
    head: SwingPoint,
    rightShoulder: SwingPoint
  ): HeadAndShouldersResult {
    // Head should be lower than both shoulders (inverted)
    if (head.price >= leftShoulder.price || head.price >= rightShoulder.price) {
      return { 
        isDetected: false, 
        confidence: 0, 
        patternType: 'head_shoulders_bullish',
        metadata: this.createEmptyMetadata()
      };
    }

    // Calculate neckline (connect the highs between shoulders and head)
    const leftNeckHigh = this.findHighestBetween(candles, leftShoulder.index, head.index);
    const rightNeckHigh = this.findHighestBetween(candles, head.index, rightShoulder.index);
    
    if (!leftNeckHigh || !rightNeckHigh) {
      return { 
        isDetected: false, 
        confidence: 0, 
        patternType: 'head_shoulders_bullish',
        metadata: this.createEmptyMetadata()
      };
    }

    const necklineLevel = (leftNeckHigh.price + rightNeckHigh.price) / 2;
    const necklineSlope = (rightNeckHigh.price - leftNeckHigh.price) / 
      (rightNeckHigh.index - leftNeckHigh.index);
      
    // Check for neckline break confirmation
    const necklineBreak = this.checkNecklineBreak(
      candles, 
      necklineLevel, 
      rightShoulder.index, 
      false // isBearish (false for bullish)
    );

    // Same key factors but inverted
    const preMoveSize = this.calculatePreMoveSize(candles, leftShoulder.index, false); // false for bullish
    const momentumChange = this.calculateMomentumChange(candles, head.index, rightShoulder.index, false);
    const rejectionStrength = (head.rejectionSize + rightShoulder.rejectionSize) / 2;
    
    const volumeConfirmation = this.checkVolumeConfirmation(candles, [
      leftShoulder.index, head.index, rightShoulder.index
    ]);

    let confidence = this.calculateBullishConfidence({
      preMoveSize,
      momentumChange,
      rejectionStrength,
      volumeConfirmation,
      headDepth: necklineLevel - head.price,
      shoulderBalance: Math.abs(leftShoulder.price - rightShoulder.price) / head.price,
      timespan: rightShoulder.index - leftShoulder.index,
      necklineBreak: necklineBreak
    });

    const metadata = {
      preMoveSize,
      momentumChange,
      volumeConfirmation,
      timespan: rightShoulder.index - leftShoulder.index,
      rejectionStrength,
      necklineBreakConfirmed: necklineBreak.hasBreak,
      necklineBreakStrength: necklineBreak.breakStrength
    };

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType: 'head_shoulders_bullish',
      leftShoulder,
      head,
      rightShoulder,
      necklineLevel,
      necklineSlope,
      metadata
    };
  }

  /**
   * Find significant peaks in the price data
   * Uses local maxima with volume and rejection confirmation
   */
  private findSignificantPeaks(candles: OHLCVCandles[]): SwingPoint[] {
    const peaks: SwingPoint[] = [];
    const lookback = 5; // Look 5 candles back and forward
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      try {
        const currentHigh = this.safeParseFloat(candles[i].high);
        let isPeak = true;
        
        // Check if this is a local maximum
        for (let j = i - lookback; j <= i + lookback; j++) {
          if (j !== i && this.safeParseFloat(candles[j].high) >= currentHigh) {
            isPeak = false;
            break;
          }
        }
        
        if (isPeak) {
          const rejectionSize = this.calculateRejectionSize(candles, i, true);
          const strength = this.calculateSwingStrength(candles, i, true);
          
          if (rejectionSize >= this.config.minRejectionSize) {
            peaks.push({
              index: i,
              price: currentHigh,
              timestamp: candles[i].timestamp,
              volume: candles[i].volume,
              isHigh: true,
              strength,
              rejectionSize
            });
          }
        }
      } catch (error) {
        console.warn(`Error processing peak at index ${i}: ${error}`);
        continue;
      }
    }
    
    return peaks.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Find significant troughs in the price data
   */
  private findSignificantTroughs(candles: OHLCVCandles[]): SwingPoint[] {
    const troughs: SwingPoint[] = [];
    const lookback = 5;
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      try {
        const currentLow = this.safeParseFloat(candles[i].low);
        let isTrough = true;
        
        // Check if this is a local minimum
        for (let j = i - lookback; j <= i + lookback; j++) {
          if (j !== i && this.safeParseFloat(candles[j].low) <= currentLow) {
            isTrough = false;
            break;
          }
        }
        
        if (isTrough) {
          const rejectionSize = this.calculateRejectionSize(candles, i, false);
          const strength = this.calculateSwingStrength(candles, i, false);
          
          if (rejectionSize >= this.config.minRejectionSize) {
            troughs.push({
              index: i,
              price: currentLow,
              timestamp: candles[i].timestamp,
              volume: candles[i].volume,
              isHigh: false,
              strength,
              rejectionSize
            });
          }
        }
      } catch (error) {
        console.warn(`Error processing trough at index ${i}: ${error}`);
        continue;
      }
    }
    
    return troughs.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Calculate the size of rejection from a swing point
   * Based on the difference between high/low and close
   */
  private calculateRejectionSize(candles: OHLCVCandles[], index: number, isHigh: boolean): number {
    if (index >= candles.length) return 0;
    
    const candle = candles[index];
    const high = this.safeParseFloat(candle.high);
    const low = this.safeParseFloat(candle.low);
    const close = this.safeParseFloat(candle.close);
    
    if (isHigh) {
      // For peaks, measure rejection from high to close
      return ((high - close) / high) * 100;
    } else {
      // For troughs, measure rejection from low to close  
      return ((close - low) / low) * 100;
    }
  }

  /**
   * Calculate swing strength based on surrounding price action and volume
   */
  private calculateSwingStrength(candles: OHLCVCandles[], index: number, isHigh: boolean): number {
    const lookback = 10;
    const start = Math.max(0, index - lookback);
    const end = Math.min(candles.length - 1, index + lookback);
    
    let strengthScore = 0;
    const currentPrice = isHigh ? 
      this.safeParseFloat(candles[index].high) : 
      this.safeParseFloat(candles[index].low);
    
    // Price strength: How much it stands out from surrounding prices
    for (let i = start; i <= end; i++) {
      if (i === index) continue;
      
      const comparePrice = isHigh ? 
        this.safeParseFloat(candles[i].high) : 
        this.safeParseFloat(candles[i].low);
      
      const priceDiff = isHigh ? 
        (currentPrice - comparePrice) / currentPrice :
        (comparePrice - currentPrice) / currentPrice;
      
      strengthScore += Math.max(0, priceDiff * 100);
    }
    
    // Volume strength: Compare volume at swing to average
    const avgVolume = this.calculateAverageVolume(candles, start, end);
    const currentVolume = candles[index].volume;
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;
    
    return strengthScore * Math.min(volumeRatio, 2.0); // Cap volume multiplier
  }

  /**
   * Calculate the size of the move leading up to the pattern
   * Riley's key factor: "Large move to give room to reverse/profit"
   */
  private calculatePreMoveSize(candles: OHLCVCandles[], patternStartIndex: number, isBearish: boolean = true): number {
    const lookback = Math.min(20, patternStartIndex);
    if (lookback < 5) return 0;
    
    const startIndex = patternStartIndex - lookback;
    const endIndex = patternStartIndex;
    
    if (isBearish) {
      // For bearish patterns, measure the upward move before
      const startLow = Math.min(...candles.slice(startIndex, startIndex + 5)
        .map(c => this.safeParseFloat(c.low)));
      const endHigh = Math.max(...candles.slice(endIndex - 5, endIndex)
        .map(c => this.safeParseFloat(c.high)));
      
      return ((endHigh - startLow) / startLow) * 100;
    } else {
      // For bullish patterns, measure the downward move before
      const startHigh = Math.max(...candles.slice(startIndex, startIndex + 5)
        .map(c => this.safeParseFloat(c.high)));
      const endLow = Math.min(...candles.slice(endIndex - 5, endIndex)
        .map(c => this.safeParseFloat(c.low)));
      
      return ((startHigh - endLow) / startHigh) * 100;
    }
  }

  /**
   * Calculate momentum change between head and right shoulder
   * Riley's key factor: "Larger than normal rejection shows a change in momentum"
   */
  private calculateMomentumChange(
    candles: OHLCVCandles[], 
    headIndex: number, 
    rightShoulderIndex: number,
    isBearish: boolean = true
  ): number {
    if (rightShoulderIndex <= headIndex) return 0;
    
    // Calculate momentum at head
    const headMomentum = this.calculateLocalMomentum(candles, headIndex, isBearish);
    
    // Calculate momentum at right shoulder  
    const shoulderMomentum = this.calculateLocalMomentum(candles, rightShoulderIndex, isBearish);
    
    // Return the change in momentum (should be negative for pattern confirmation)
    return shoulderMomentum - headMomentum;
  }

  /**
   * Calculate local momentum at a specific point
   */
  private calculateLocalMomentum(candles: OHLCVCandles[], index: number, isBearish: boolean): number {
    const period = 5;
    const start = Math.max(0, index - period);
    const end = Math.min(candles.length - 1, index + period);
    
    if (end - start < 2) return 0;
    
    let totalChange = 0;
    let count = 0;
    
    for (let i = start; i < end; i++) {
      const currentClose = this.safeParseFloat(candles[i].close);
      const nextClose = this.safeParseFloat(candles[i + 1].close);
      const change = ((nextClose - currentClose) / currentClose) * 100;
      
      if (isBearish) {
        // For bearish patterns, positive momentum is upward price movement
        totalChange += change;
      } else {
        // For bullish patterns, negative momentum is downward price movement
        totalChange -= change;
      }
      count++;
    }
    
    return count > 0 ? totalChange / count : 0;
  }

  /**
   * Check volume confirmation for the pattern
   */
  private checkVolumeConfirmation(candles: OHLCVCandles[], keyIndices: number[]): boolean {
    const avgVolume = this.calculateAverageVolume(candles, 0, candles.length - 1);
    
    for (const index of keyIndices) {
      if (index < candles.length && candles[index].volume > avgVolume * this.config.volumeThreshold) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate average volume over a range
   */
  private calculateAverageVolume(candles: OHLCVCandles[], startIndex: number, endIndex: number): number {
    if (startIndex >= endIndex) return 0;
    
    const sum = candles.slice(startIndex, endIndex + 1)
      .reduce((total, candle) => total + candle.volume, 0);
    
    return sum / (endIndex - startIndex + 1);
  }

  /**
   * Find the lowest point between two indices
   */
  private findLowestBetween(candles: OHLCVCandles[], startIndex: number, endIndex: number): PatternPoint | null {
    if (startIndex >= endIndex || endIndex >= candles.length) return null;
    
    let lowestPrice = Infinity;
    let lowestIndex = -1;
    
    for (let i = startIndex; i <= endIndex; i++) {
      const low = this.safeParseFloat(candles[i].low);
      if (low < lowestPrice) {
        lowestPrice = low;
        lowestIndex = i;
      }
    }
    
    if (lowestIndex === -1) return null;
    
    return {
      index: lowestIndex,
      price: lowestPrice,
      timestamp: candles[lowestIndex].timestamp,
      volume: candles[lowestIndex].volume,
      isHigh: false
    };
  }

  /**
   * Find the highest point between two indices
   */
  private findHighestBetween(candles: OHLCVCandles[], startIndex: number, endIndex: number): PatternPoint | null {
    if (startIndex >= endIndex || endIndex >= candles.length) return null;
    
    let highestPrice = -Infinity;
    let highestIndex = -1;
    
    for (let i = startIndex; i <= endIndex; i++) {
      const high = this.safeParseFloat(candles[i].high);
      if (high > highestPrice) {
        highestPrice = high;
        highestIndex = i;
      }
    }
    
    if (highestIndex === -1) return null;
    
    return {
      index: highestIndex,
      price: highestPrice,
      timestamp: candles[highestIndex].timestamp,
      volume: candles[highestIndex].volume,
      isHigh: true
    };
  }

  /**
   * Calculate confidence score for bearish Head and Shoulders pattern
   * Based on Riley Coleman's key factors
   */
  private calculateBearishConfidence(factors: {
    preMoveSize: number;
    momentumChange: number;
    rejectionStrength: number;
    volumeConfirmation: boolean;
    headHeight: number;
    shoulderBalance: number;
    timespan: number;
    necklineBreak: { hasBreak: boolean; breakStrength: number };
  }): number {
    let confidence = 0;
    
    // Pre-move size (Riley: "Large move to give room to reverse/profit")
    // Higher score for larger preceding moves
    confidence += Math.min(factors.preMoveSize * 2, 25); // Max 25 points
    
    // Momentum change (Riley: "Larger than normal rejection shows a change in momentum")  
    // Negative momentum change is good for bearish pattern
    if (factors.momentumChange < 0) {
      confidence += Math.min(Math.abs(factors.momentumChange) * 3, 25); // Max 25 points
    }
    
    // Rejection strength (average rejection size at key levels)
    confidence += Math.min(factors.rejectionStrength * 2, 20); // Max 20 points
    
    // Volume confirmation
    if (factors.volumeConfirmation) {
      confidence += 15;
    }
    
    // Head prominence (how much head stands out)
    confidence += Math.min(factors.headHeight * 0.5, 10); // Max 10 points
    
    // Shoulder balance (penalty for very unbalanced shoulders)
    const balancePenalty = factors.shoulderBalance > 0.1 ? factors.shoulderBalance * 20 : 0;
    confidence -= Math.min(balancePenalty, 10);
    
    // Time factor (moderate timespan is preferred)
    const optimalTimespan = 15; // candles
    const timeFactor = 1 - Math.abs(factors.timespan - optimalTimespan) / optimalTimespan;
    confidence += timeFactor * 5;
    
    // Neckline break confirmation (Critical for Riley's approach)
    if (factors.necklineBreak.hasBreak) {
      confidence += 15; // Strong bonus for confirmed break
      confidence += Math.min(factors.necklineBreak.breakStrength * 2, 10); // Additional points for strong break
    } else {
      // Moderate penalty for no neckline break (allow early detection)
      confidence -= 5;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate confidence score for bullish Head and Shoulders pattern
   */
  private calculateBullishConfidence(factors: {
    preMoveSize: number;
    momentumChange: number;
    rejectionStrength: number;
    volumeConfirmation: boolean;
    headDepth: number;
    shoulderBalance: number;
    timespan: number;
    necklineBreak: { hasBreak: boolean; breakStrength: number };
  }): number {
    let confidence = 0;
    
    // Pre-move size (downward move for bullish pattern)
    confidence += Math.min(factors.preMoveSize * 2, 25);
    
    // Momentum change (positive momentum change is good for bullish pattern)
    if (factors.momentumChange > 0) {
      confidence += Math.min(factors.momentumChange * 3, 25);
    }
    
    // Rejection strength
    confidence += Math.min(factors.rejectionStrength * 2, 20);
    
    // Volume confirmation
    if (factors.volumeConfirmation) {
      confidence += 15;
    }
    
    // Head depth (how deep the head goes below neckline)
    confidence += Math.min(factors.headDepth * 0.5, 10);
    
    // Shoulder balance penalty
    const balancePenalty = factors.shoulderBalance > 0.1 ? factors.shoulderBalance * 20 : 0;
    confidence -= Math.min(balancePenalty, 10);
    
    // Time factor
    const optimalTimespan = 15;
    const timeFactor = 1 - Math.abs(factors.timespan - optimalTimespan) / optimalTimespan;
    confidence += timeFactor * 5;
    
    // Neckline break confirmation (Critical for Riley's approach)
    if (factors.necklineBreak.hasBreak) {
      confidence += 15; // Strong bonus for confirmed break
      confidence += Math.min(factors.necklineBreak.breakStrength * 2, 10); // Additional points for strong break
    } else {
      // Moderate penalty for no neckline break (allow early detection)
      confidence -= 5;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  private createEmptyMetadata() {
    return {
      preMoveSize: 0,
      momentumChange: 0,
      volumeConfirmation: false,
      timespan: 0,
      rejectionStrength: 0,
      necklineBreakConfirmed: false,
      necklineBreakStrength: 0
    };
  }

  private createPatternSignal(
    result: HeadAndShouldersResult,
    strategyId: string,
    symbol: string,
    timeframe: TimeframeType,
    candles: OHLCVCandles[]
  ): InsertPatternSignal {
    const detectionTime = result.head ? 
      result.head.timestamp : 
      candles[candles.length - 1].timestamp;
    
    const priceLevel = result.necklineLevel || result.head?.price || 0;

    return {
      strategyId,
      symbol,
      patternType: result.patternType,
      timeframe,
      confidence: result.confidence.toString(),
      detectedAt: detectionTime,
      priceLevel: priceLevel.toString(),
      metadata: {
        ...result.metadata,
        leftShoulderPrice: result.leftShoulder?.price,
        headPrice: result.head?.price,
        rightShoulderPrice: result.rightShoulder?.price,
        necklineLevel: result.necklineLevel,
        necklineSlope: result.necklineSlope
      },
      isActive: true
    };
  }

  /**
   * Create pattern signal for reversal flag patterns
   */
  private createReversalFlagSignal(
    result: ReversalFlagResult,
    strategyId: string,
    symbol: string,
    timeframe: TimeframeType,
    candles: OHLCVCandles[]
  ): InsertPatternSignal {
    const detectionTime = result.flagEnd ? 
      result.flagEnd.timestamp : 
      candles[candles.length - 1].timestamp;
    
    const priceLevel = result.breakoutLevel || result.supportResistanceLevel || 0;

    return {
      strategyId,
      symbol,
      patternType: result.patternType,
      timeframe,
      confidence: result.confidence.toString(),
      detectedAt: detectionTime,
      priceLevel: priceLevel.toString(),
      metadata: {
        ...result.metadata,
        poleStartPrice: result.poleStart?.price,
        poleEndPrice: result.poleEnd?.price,
        flagStartPrice: result.flagStart?.price,
        flagEndPrice: result.flagEnd?.price,
        supportResistanceLevel: result.supportResistanceLevel,
        breakoutLevel: result.breakoutLevel
      },
      isActive: true
    };
  }

  /**
   * Detect bearish reversal flag pattern
   * Riley's focus: Strong upward momentum + consolidation at resistance + momentum loss
   */
  private detectBearishReversalFlag(candles: OHLCVCandles[]): ReversalFlagResult {
    if (candles.length < this.config.minCandles) {
      return this.createEmptyReversalFlagResult('reversal_flag_bearish');
    }

    // Scan for potential flag patterns in recent data
    const scanStart = Math.max(0, candles.length - this.config.lookbackPeriod);
    
    for (let flagEndIndex = candles.length - 3; flagEndIndex >= scanStart + 15; flagEndIndex--) {
      // Look backwards to find consolidation phase
      const consolidationResult = this.findConsolidationPhase(
        candles, 
        flagEndIndex, 
        true // isBearish
      );

      if (!consolidationResult.isValid) continue;

      const flagStartIndex = consolidationResult.startIndex;
      
      // Look for the momentum pole before consolidation
      const poleResult = this.analyzeMomentumPole(
        candles, 
        flagStartIndex, 
        true // isBearish (upward pole)
      );

      if (!poleResult.isValid) continue;

      // Validate support/resistance level
      const srLevel = this.findSupportResistanceLevel(
        candles, 
        poleResult.endIndex, 
        flagEndIndex, 
        true // isBearish
      );

      if (!srLevel.isSignificant) continue;

      // Check for breakout confirmation
      const breakoutResult = this.checkFlagBreakout(
        candles,
        flagEndIndex,
        srLevel.level,
        true // isBearish (expect downward break)
      );

      // Calculate confidence
      const confidence = this.calculateReversalFlagConfidence({
        poleSize: poleResult.size,
        poleDuration: poleResult.duration,
        pullbackRatio: poleResult.pullbackRatio,
        consolidationDuration: consolidationResult.duration,
        consolidationVolatility: consolidationResult.volatility,
        volumeDecline: consolidationResult.volumeDeclined,
        supportResistanceStrength: srLevel.strength,
        momentumLossConfirmed: consolidationResult.momentumLoss,
        breakoutConfirmed: breakoutResult.hasBreakout,
        breakoutStrength: breakoutResult.strength
      }, true); // isBearish

      if (confidence >= this.config.confidenceThreshold) {
        return {
          isDetected: true,
          confidence,
          patternType: 'reversal_flag_bearish',
          poleStart: {
            index: poleResult.startIndex,
            price: this.safeParseFloat(candles[poleResult.startIndex].low),
            timestamp: candles[poleResult.startIndex].timestamp,
            volume: candles[poleResult.startIndex].volume,
            isHigh: false
          },
          poleEnd: {
            index: poleResult.endIndex,
            price: this.safeParseFloat(candles[poleResult.endIndex].high),
            timestamp: candles[poleResult.endIndex].timestamp,
            volume: candles[poleResult.endIndex].volume,
            isHigh: true
          },
          flagStart: {
            index: flagStartIndex,
            price: this.safeParseFloat(candles[flagStartIndex].high),
            timestamp: candles[flagStartIndex].timestamp,
            volume: candles[flagStartIndex].volume,
            isHigh: true
          },
          flagEnd: {
            index: flagEndIndex,
            price: this.safeParseFloat(candles[flagEndIndex].low),
            timestamp: candles[flagEndIndex].timestamp,
            volume: candles[flagEndIndex].volume,
            isHigh: false
          },
          supportResistanceLevel: srLevel.level,
          breakoutLevel: breakoutResult.breakoutLevel,
          metadata: {
            poleSize: poleResult.size,
            poleDuration: poleResult.duration,
            pullbackRatio: poleResult.pullbackRatio,
            consolidationDuration: consolidationResult.duration,
            consolidationVolatility: consolidationResult.volatility,
            volumeDecline: consolidationResult.volumeDeclined,
            supportResistanceStrength: srLevel.strength,
            momentumLossConfirmed: consolidationResult.momentumLoss,
            breakoutConfirmed: breakoutResult.hasBreakout
          }
        };
      }
    }

    return this.createEmptyReversalFlagResult('reversal_flag_bearish');
  }

  /**
   * Detect bullish reversal flag pattern (inverted)
   * Riley's focus: Strong downward momentum + consolidation at support + momentum loss
   */
  private detectBullishReversalFlag(candles: OHLCVCandles[]): ReversalFlagResult {
    if (candles.length < this.config.minCandles) {
      return this.createEmptyReversalFlagResult('reversal_flag_bullish');
    }

    // Scan for potential flag patterns in recent data
    const scanStart = Math.max(0, candles.length - this.config.lookbackPeriod);
    
    for (let flagEndIndex = candles.length - 3; flagEndIndex >= scanStart + 15; flagEndIndex--) {
      // Look backwards to find consolidation phase
      const consolidationResult = this.findConsolidationPhase(
        candles, 
        flagEndIndex, 
        false // isBearish (false for bullish)
      );

      if (!consolidationResult.isValid) continue;

      const flagStartIndex = consolidationResult.startIndex;
      
      // Look for the momentum pole before consolidation
      const poleResult = this.analyzeMomentumPole(
        candles, 
        flagStartIndex, 
        false // isBearish (false = downward pole for bullish pattern)
      );

      if (!poleResult.isValid) continue;

      // Validate support/resistance level
      const srLevel = this.findSupportResistanceLevel(
        candles, 
        poleResult.endIndex, 
        flagEndIndex, 
        false // isBearish (false for bullish)
      );

      if (!srLevel.isSignificant) continue;

      // Check for breakout confirmation
      const breakoutResult = this.checkFlagBreakout(
        candles,
        flagEndIndex,
        srLevel.level,
        false // isBearish (false = expect upward break)
      );

      // Calculate confidence
      const confidence = this.calculateReversalFlagConfidence({
        poleSize: poleResult.size,
        poleDuration: poleResult.duration,
        pullbackRatio: poleResult.pullbackRatio,
        consolidationDuration: consolidationResult.duration,
        consolidationVolatility: consolidationResult.volatility,
        volumeDecline: consolidationResult.volumeDeclined,
        supportResistanceStrength: srLevel.strength,
        momentumLossConfirmed: consolidationResult.momentumLoss,
        breakoutConfirmed: breakoutResult.hasBreakout,
        breakoutStrength: breakoutResult.strength
      }, false); // isBearish = false

      if (confidence >= this.config.confidenceThreshold) {
        return {
          isDetected: true,
          confidence,
          patternType: 'reversal_flag_bullish',
          poleStart: {
            index: poleResult.startIndex,
            price: this.safeParseFloat(candles[poleResult.startIndex].high),
            timestamp: candles[poleResult.startIndex].timestamp,
            volume: candles[poleResult.startIndex].volume,
            isHigh: true
          },
          poleEnd: {
            index: poleResult.endIndex,
            price: this.safeParseFloat(candles[poleResult.endIndex].low),
            timestamp: candles[poleResult.endIndex].timestamp,
            volume: candles[poleResult.endIndex].volume,
            isHigh: false
          },
          flagStart: {
            index: flagStartIndex,
            price: this.safeParseFloat(candles[flagStartIndex].low),
            timestamp: candles[flagStartIndex].timestamp,
            volume: candles[flagStartIndex].volume,
            isHigh: false
          },
          flagEnd: {
            index: flagEndIndex,
            price: this.safeParseFloat(candles[flagEndIndex].high),
            timestamp: candles[flagEndIndex].timestamp,
            volume: candles[flagEndIndex].volume,
            isHigh: true
          },
          supportResistanceLevel: srLevel.level,
          breakoutLevel: breakoutResult.breakoutLevel,
          metadata: {
            poleSize: poleResult.size,
            poleDuration: poleResult.duration,
            pullbackRatio: poleResult.pullbackRatio,
            consolidationDuration: consolidationResult.duration,
            consolidationVolatility: consolidationResult.volatility,
            volumeDecline: consolidationResult.volumeDeclined,
            supportResistanceStrength: srLevel.strength,
            momentumLossConfirmed: consolidationResult.momentumLoss,
            breakoutConfirmed: breakoutResult.hasBreakout
          }
        };
      }
    }

    return this.createEmptyReversalFlagResult('reversal_flag_bullish');
  }

  /**
   * Create empty reversal flag result
   */
  private createEmptyReversalFlagResult(patternType: 'reversal_flag_bearish' | 'reversal_flag_bullish'): ReversalFlagResult {
    return {
      isDetected: false,
      confidence: 0,
      patternType,
      metadata: {
        poleSize: 0,
        poleDuration: 0,
        pullbackRatio: 0,
        consolidationDuration: 0,
        consolidationVolatility: 0,
        volumeDecline: false,
        supportResistanceStrength: 0,
        momentumLossConfirmed: false,
        breakoutConfirmed: false
      }
    };
  }

  /**
   * Find consolidation phase - sideways movement after momentum
   * Riley's key factor: Transition from directional to sideways movement
   */
  private findConsolidationPhase(
    candles: OHLCVCandles[], 
    endIndex: number, 
    isBearish: boolean
  ): {
    isValid: boolean;
    startIndex: number;
    duration: number;
    volatility: number;
    volumeDeclined: boolean;
    momentumLoss: boolean;
  } {
    const maxDuration = this.config.maxConsolidationDuration;
    const minDuration = this.config.minConsolidationDuration;
    let bestStartIndex = -1;
    let bestResult = { isValid: false, startIndex: -1, duration: 0, volatility: 0, volumeDeclined: false, momentumLoss: false };

    // Look backwards for consolidation start
    for (let duration = minDuration; duration <= maxDuration && endIndex - duration >= 0; duration++) {
      const startIndex = endIndex - duration + 1;
      
      // Calculate price range during consolidation period
      const prices = candles.slice(startIndex, endIndex + 1)
        .map(c => ({
          high: this.safeParseFloat(c.high),
          low: this.safeParseFloat(c.low),
          close: this.safeParseFloat(c.close)
        }));

      const maxPrice = Math.max(...prices.map(p => p.high));
      const minPrice = Math.min(...prices.map(p => p.low));
      const priceRange = ((maxPrice - minPrice) / minPrice) * 100;

      // Check if volatility is within acceptable range (sideways movement)
      if (priceRange > this.config.consolidationVolatilityThreshold) continue;

      // Check volume decline during consolidation
      const volumeDeclined = this.checkVolumeDecline(candles, startIndex, endIndex);
      
      // Check momentum loss compared to pre-consolidation period
      const momentumLoss = this.checkMomentumLoss(candles, startIndex, endIndex, isBearish);

      if (momentumLoss && priceRange <= this.config.consolidationVolatilityThreshold) {
        bestResult = {
          isValid: true,
          startIndex,
          duration,
          volatility: priceRange,
          volumeDeclined,
          momentumLoss: true
        };
        break; // Take the first valid consolidation found
      }
    }

    return bestResult;
  }

  /**
   * Analyze momentum pole - strong directional movement with minimal pullbacks
   * Riley's key factor: Strong momentum with no pullbacks increases chance to fail
   */
  private analyzeMomentumPole(
    candles: OHLCVCandles[], 
    flagStartIndex: number, 
    isBearish: boolean
  ): {
    isValid: boolean;
    startIndex: number;
    endIndex: number;
    size: number;
    duration: number;
    pullbackRatio: number;
  } {
    const maxPoleDuration = Math.min(25, flagStartIndex);
    const minPoleDuration = 8;
    
    for (let duration = minPoleDuration; duration <= maxPoleDuration; duration++) {
      const poleStartIndex = flagStartIndex - duration;
      if (poleStartIndex < 0) break;

      const poleSize = this.calculateMoveSize(
        candles, 
        poleStartIndex, 
        flagStartIndex, 
        isBearish
      );

      if (poleSize < this.config.minPoleSize) continue;

      // Calculate pullback ratio during pole
      const pullbackRatio = this.calculatePullbackRatio(
        candles, 
        poleStartIndex, 
        flagStartIndex, 
        isBearish
      );

      if (pullbackRatio <= this.config.maxPullbackRatio) {
        return {
          isValid: true,
          startIndex: poleStartIndex,
          endIndex: flagStartIndex,
          size: poleSize,
          duration,
          pullbackRatio
        };
      }
    }

    return {
      isValid: false,
      startIndex: -1,
      endIndex: -1,
      size: 0,
      duration: 0,
      pullbackRatio: 1.0
    };
  }

  /**
   * Find major support/resistance level
   * Riley's key factor: At a major resistance/support zone
   */
  private findSupportResistanceLevel(
    candles: OHLCVCandles[], 
    poleEndIndex: number, 
    flagEndIndex: number, 
    isBearish: boolean
  ): {
    isSignificant: boolean;
    level: number;
    strength: number;
  } {
    // Get price range during flag formation
    const flagPrices = candles.slice(poleEndIndex, flagEndIndex + 1);
    
    let targetLevel: number;
    if (isBearish) {
      // For bearish pattern, resistance is at the top of consolidation
      targetLevel = Math.max(...flagPrices.map(c => this.safeParseFloat(c.high)));
    } else {
      // For bullish pattern, support is at the bottom of consolidation
      targetLevel = Math.min(...flagPrices.map(c => this.safeParseFloat(c.low)));
    }

    // Test how significant this level is by looking at historical price action
    const lookbackPeriod = Math.min(50, poleEndIndex);
    const historicalCandles = candles.slice(Math.max(0, poleEndIndex - lookbackPeriod), poleEndIndex);
    
    let touchCount = 0;
    let rejectionCount = 0;
    const tolerance = targetLevel * 0.005; // 0.5% tolerance

    for (const candle of historicalCandles) {
      const high = this.safeParseFloat(candle.high);
      const low = this.safeParseFloat(candle.low);
      const close = this.safeParseFloat(candle.close);

      if (isBearish) {
        // Test resistance level
        if (high >= targetLevel - tolerance && high <= targetLevel + tolerance) {
          touchCount++;
          if (close < high - (high * 0.01)) { // 1% rejection
            rejectionCount++;
          }
        }
      } else {
        // Test support level
        if (low >= targetLevel - tolerance && low <= targetLevel + tolerance) {
          touchCount++;
          if (close > low + (low * 0.01)) { // 1% bounce
            rejectionCount++;
          }
        }
      }
    }

    // Calculate strength based on touches and rejections
    const strength = (touchCount * 10) + (rejectionCount * 15);
    const isSignificant = touchCount >= 2 && strength >= 25;

    return {
      isSignificant,
      level: targetLevel,
      strength
    };
  }

  /**
   * Check for flag breakout confirmation
   */
  private checkFlagBreakout(
    candles: OHLCVCandles[],
    flagEndIndex: number,
    supportResistanceLevel: number,
    isBearish: boolean
  ): {
    hasBreakout: boolean;
    breakoutLevel: number;
    strength: number;
  } {
    const lookAheadPeriod = Math.min(5, candles.length - flagEndIndex - 1);
    let hasBreakout = false;
    let maxBreakDistance = 0;
    let breakoutLevel = supportResistanceLevel;

    for (let i = flagEndIndex + 1; i <= flagEndIndex + lookAheadPeriod; i++) {
      if (i >= candles.length) break;

      try {
        const close = this.safeParseFloat(candles[i].close);
        const low = this.safeParseFloat(candles[i].low);
        const high = this.safeParseFloat(candles[i].high);

        if (isBearish) {
          // For bearish flag, look for break below support/resistance
          if (close < supportResistanceLevel || low < supportResistanceLevel) {
            hasBreakout = true;
            const breakDistance = Math.abs(Math.min(close, low) - supportResistanceLevel) / supportResistanceLevel;
            if (breakDistance > maxBreakDistance) {
              maxBreakDistance = breakDistance;
              breakoutLevel = Math.min(close, low);
            }
          }
        } else {
          // For bullish flag, look for break above support/resistance
          if (close > supportResistanceLevel || high > supportResistanceLevel) {
            hasBreakout = true;
            const breakDistance = Math.abs(Math.max(close, high) - supportResistanceLevel) / supportResistanceLevel;
            if (breakDistance > maxBreakDistance) {
              maxBreakDistance = breakDistance;
              breakoutLevel = Math.max(close, high);
            }
          }
        }
      } catch (error) {
        console.warn(`Error checking flag breakout at index ${i}: ${error}`);
        continue;
      }
    }

    return {
      hasBreakout,
      breakoutLevel,
      strength: maxBreakDistance * 100
    };
  }

  /**
   * Calculate confidence for reversal flag pattern
   * Based on Riley Coleman's key factors
   */
  private calculateReversalFlagConfidence(
    factors: {
      poleSize: number;
      poleDuration: number;
      pullbackRatio: number;
      consolidationDuration: number;
      consolidationVolatility: number;
      volumeDecline: boolean;
      supportResistanceStrength: number;
      momentumLossConfirmed: boolean;
      breakoutConfirmed: boolean;
      breakoutStrength: number;
    },
    isBearish: boolean
  ): number {
    let confidence = 0;

    // Riley's key factor: Strong momentum with no pullbacks (25 points max)
    // Larger pole size gives higher confidence
    confidence += Math.min(factors.poleSize, 25); // Direct percentage score
    
    // Minimal pullbacks during pole (crucial for pattern validity)
    const pullbackBonus = (1 - factors.pullbackRatio) * 20; // Max 20 points
    confidence += pullbackBonus;

    // Riley's key factor: Transition from directional to sideways movement (20 points max)
    if (factors.momentumLossConfirmed) {
      confidence += 15; // Confirmed momentum loss
    }
    
    // Lower volatility during consolidation is better
    const volatilityScore = Math.max(0, (this.config.consolidationVolatilityThreshold - factors.consolidationVolatility)) * 2.5;
    confidence += Math.min(volatilityScore, 10);

    // Riley's key factor: At major resistance/support zone (15 points max)
    confidence += Math.min(factors.supportResistanceStrength * 0.3, 15);

    // Volume decline during consolidation (good sign)
    if (factors.volumeDecline) {
      confidence += 10;
    }

    // Optimal consolidation duration (moderate is best)
    const optimalDuration = (this.config.minConsolidationDuration + this.config.maxConsolidationDuration) / 2;
    const durationFactor = 1 - Math.abs(factors.consolidationDuration - optimalDuration) / optimalDuration;
    confidence += durationFactor * 5;

    // Breakout confirmation (strong bonus if confirmed)
    if (factors.breakoutConfirmed) {
      confidence += 10; // Base breakout bonus
      confidence += Math.min(factors.breakoutStrength * 2, 10); // Strength bonus
    } else {
      // Small penalty for no breakout (allow early detection)
      confidence -= 2;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  // Helper methods for consolidation and momentum analysis

  /**
   * Check if volume declined during consolidation period
   */
  private checkVolumeDecline(candles: OHLCVCandles[], startIndex: number, endIndex: number): boolean {
    if (endIndex - startIndex < 3) return false;

    const midPoint = Math.floor((startIndex + endIndex) / 2);
    const earlyVolume = this.calculateAverageVolume(candles, startIndex, midPoint);
    const lateVolume = this.calculateAverageVolume(candles, midPoint + 1, endIndex);

    return lateVolume < earlyVolume * 0.8; // 20% decline
  }

  /**
   * Check for momentum loss during consolidation
   */
  private checkMomentumLoss(
    candles: OHLCVCandles[], 
    startIndex: number, 
    endIndex: number, 
    isBearish: boolean
  ): boolean {
    if (endIndex - startIndex < 3) return false;

    // Compare momentum before and during consolidation
    const preMomentumPeriod = Math.min(10, startIndex);
    const preMomentum = this.calculateLocalMomentum(candles, startIndex - preMomentumPeriod, isBearish);
    const consolidationMomentum = this.calculateLocalMomentum(candles, Math.floor((startIndex + endIndex) / 2), isBearish);

    // Significant momentum reduction indicates pattern formation
    return Math.abs(consolidationMomentum) < Math.abs(preMomentum) * 0.3; // 70% momentum loss
  }

  /**
   * Calculate move size between two points
   */
  private calculateMoveSize(
    candles: OHLCVCandles[], 
    startIndex: number, 
    endIndex: number, 
    isBearish: boolean
  ): number {
    if (startIndex >= endIndex || endIndex >= candles.length) return 0;

    if (isBearish) {
      // For bearish pattern, measure upward move (pole up)
      const startLow = this.safeParseFloat(candles[startIndex].low);
      const endHigh = this.safeParseFloat(candles[endIndex].high);
      return ((endHigh - startLow) / startLow) * 100;
    } else {
      // For bullish pattern, measure downward move (pole down)
      const startHigh = this.safeParseFloat(candles[startIndex].high);
      const endLow = this.safeParseFloat(candles[endIndex].low);
      return ((startHigh - endLow) / startHigh) * 100;
    }
  }

  /**
   * Calculate pullback ratio during momentum phase
   * Riley's key: "Strong momentum with no pullbacks increases chance to fail"
   */
  private calculatePullbackRatio(
    candles: OHLCVCandles[], 
    startIndex: number, 
    endIndex: number, 
    isBearish: boolean
  ): number {
    if (startIndex >= endIndex) return 1.0;

    let totalMove = 0;
    let adverseMove = 0;

    for (let i = startIndex; i < endIndex; i++) {
      const currentClose = this.safeParseFloat(candles[i].close);
      const nextClose = this.safeParseFloat(candles[i + 1].close);
      const move = nextClose - currentClose;

      totalMove += Math.abs(move);

      if (isBearish) {
        // For bearish pattern (upward pole), adverse move is downward
        if (move < 0) {
          adverseMove += Math.abs(move);
        }
      } else {
        // For bullish pattern (downward pole), adverse move is upward
        if (move > 0) {
          adverseMove += Math.abs(move);
        }
      }
    }

    return totalMove > 0 ? adverseMove / totalMove : 1.0;
  }

  // Three Line Strike Pattern Detection Methods

  /**
   * Detect bearish Three Line Strike pattern
   * Riley's rule: Large reversal candle gives back movement of last 3-5 candles
   */
  private detectBearishThreeLineStrike(candles: OHLCVCandles[]): ThreeLineStrikeResult {
    // Need minimum candles for preceding movement + reversal candle
    if (candles.length < this.config.minPrecedingCandles + 1) {
      return this.createEmptyThreeLineStrikeResult('three_line_strike_bearish');
    }

    // Look for reversal candles starting from the most recent
    for (let reversalIndex = this.config.minPrecedingCandles; reversalIndex < candles.length; reversalIndex++) {
      const result = this.analyzeBearishThreeLineStrike(candles, reversalIndex);
      if (result.isDetected) {
        return result;
      }
    }

    return this.createEmptyThreeLineStrikeResult('three_line_strike_bearish');
  }

  /**
   * Detect bullish Three Line Strike pattern
   * Inverted logic from bearish pattern
   */
  private detectBullishThreeLineStrike(candles: OHLCVCandles[]): ThreeLineStrikeResult {
    if (candles.length < this.config.minPrecedingCandles + 1) {
      return this.createEmptyThreeLineStrikeResult('three_line_strike_bullish');
    }

    for (let reversalIndex = this.config.minPrecedingCandles; reversalIndex < candles.length; reversalIndex++) {
      const result = this.analyzeBullishThreeLineStrike(candles, reversalIndex);
      if (result.isDetected) {
        return result;
      }
    }

    return this.createEmptyThreeLineStrikeResult('three_line_strike_bullish');
  }

  /**
   * Analyze potential bearish Three Line Strike at given reversal candle index
   * Focus: Large red candle gives back movement of preceding green candles
   */
  private analyzeBearishThreeLineStrike(
    candles: OHLCVCandles[], 
    reversalIndex: number
  ): ThreeLineStrikeResult {
    try {
      const reversalCandle = candles[reversalIndex];
      const reversalOpen = this.safeParseFloat(reversalCandle.open);
      const reversalClose = this.safeParseFloat(reversalCandle.close);
      const reversalHigh = this.safeParseFloat(reversalCandle.high);
      const reversalLow = this.safeParseFloat(reversalCandle.low);

      // Must be a bearish (red) candle
      if (reversalClose >= reversalOpen) {
        return this.createEmptyThreeLineStrikeResult('three_line_strike_bearish');
      }

      // Find optimal preceding movement window (3-5 candles)
      let bestResult: ThreeLineStrikeResult | null = null;
      let highestConfidence = 0;

      for (let precedingDuration = this.config.minPrecedingCandles; 
           precedingDuration <= Math.min(this.config.maxPrecedingCandles, reversalIndex); 
           precedingDuration++) {
        
        const precedingStart = reversalIndex - precedingDuration;
        const precedingEnd = reversalIndex - 1;

        // Analyze the preceding movement
        const precedingAnalysis = this.analyzePrecedingMovement(
          candles, 
          precedingStart, 
          precedingEnd, 
          true // isBearish pattern (expecting upward preceding movement)
        );

        if (precedingAnalysis.movementSize < this.config.minPrecedingMovement) {
          continue; // Not enough preceding movement
        }

        // Calculate reversal strength
        const reversalMovement = ((reversalOpen - reversalClose) / reversalOpen) * 100;
        const negationRatio = reversalMovement / precedingAnalysis.movementSize;

        if (negationRatio < this.config.minNegationRatio) {
          continue; // Reversal doesn't give back enough movement
        }

        if (reversalMovement / precedingAnalysis.movementSize < this.config.minReversalRatio) {
          continue; // Reversal candle not large enough relative to preceding movement
        }

        // Calculate momentum exhaustion
        const momentumExhaustion = this.calculateMomentumExhaustion(
          candles, 
          precedingStart, 
          precedingEnd
        );

        // Volume confirmation
        const volumeConfirmation = this.checkReversalVolumeConfirmation(
          candles, 
          reversalIndex, 
          precedingStart, 
          precedingEnd
        );

        // Calculate candle strength (size relative to recent range)
        const candleStrength = this.calculateCandleStrength(candles, reversalIndex);

        // Calculate confidence
        const confidence = this.calculateThreeLineStrikeConfidence({
          precedingMovement: precedingAnalysis.movementSize,
          reversalMovement,
          negationRatio,
          precedingDuration,
          momentumExhaustion,
          volumeConfirmation,
          candleStrength,
          momentumLossConfirmed: precedingAnalysis.momentumLoss
        });

        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestResult = {
            isDetected: confidence >= this.config.confidenceThreshold,
            confidence,
            patternType: 'three_line_strike_bearish',
            precedingStart: {
              index: precedingStart,
              price: this.safeParseFloat(candles[precedingStart].low),
              timestamp: candles[precedingStart].timestamp,
              volume: candles[precedingStart].volume,
              isHigh: false
            },
            precedingEnd: {
              index: precedingEnd,
              price: this.safeParseFloat(candles[precedingEnd].high),
              timestamp: candles[precedingEnd].timestamp,
              volume: candles[precedingEnd].volume,
              isHigh: true
            },
            reversalCandle: {
              index: reversalIndex,
              price: reversalClose,
              timestamp: reversalCandle.timestamp,
              volume: reversalCandle.volume,
              isHigh: false
            },
            metadata: {
              precedingMovement: precedingAnalysis.movementSize,
              reversalMovement,
              negationRatio,
              precedingDuration,
              momentumLossConfirmed: precedingAnalysis.momentumLoss,
              volumeConfirmation,
              candleStrength,
              momentumExhaustion,
              requiresConfirmation: true
            }
          };
        }
      }

      return bestResult || this.createEmptyThreeLineStrikeResult('three_line_strike_bearish');

    } catch (error) {
      console.warn(`Error analyzing bearish Three Line Strike at index ${reversalIndex}: ${error}`);
      return this.createEmptyThreeLineStrikeResult('three_line_strike_bearish');
    }
  }

  /**
   * Analyze potential bullish Three Line Strike at given reversal candle index
   * Focus: Large green candle gives back movement of preceding red candles
   */
  private analyzeBullishThreeLineStrike(
    candles: OHLCVCandles[], 
    reversalIndex: number
  ): ThreeLineStrikeResult {
    try {
      const reversalCandle = candles[reversalIndex];
      const reversalOpen = this.safeParseFloat(reversalCandle.open);
      const reversalClose = this.safeParseFloat(reversalCandle.close);
      const reversalHigh = this.safeParseFloat(reversalCandle.high);
      const reversalLow = this.safeParseFloat(reversalCandle.low);

      // Must be a bullish (green) candle
      if (reversalClose <= reversalOpen) {
        return this.createEmptyThreeLineStrikeResult('three_line_strike_bullish');
      }

      let bestResult: ThreeLineStrikeResult | null = null;
      let highestConfidence = 0;

      for (let precedingDuration = this.config.minPrecedingCandles; 
           precedingDuration <= Math.min(this.config.maxPrecedingCandles, reversalIndex); 
           precedingDuration++) {
        
        const precedingStart = reversalIndex - precedingDuration;
        const precedingEnd = reversalIndex - 1;

        // Analyze the preceding downward movement
        const precedingAnalysis = this.analyzePrecedingMovement(
          candles, 
          precedingStart, 
          precedingEnd, 
          false // isBearish pattern (expecting downward preceding movement)
        );

        if (precedingAnalysis.movementSize < this.config.minPrecedingMovement) {
          continue;
        }

        // Calculate reversal strength
        const reversalMovement = ((reversalClose - reversalOpen) / reversalOpen) * 100;
        const negationRatio = reversalMovement / precedingAnalysis.movementSize;

        if (negationRatio < this.config.minNegationRatio) {
          continue;
        }

        if (reversalMovement / precedingAnalysis.movementSize < this.config.minReversalRatio) {
          continue;
        }

        const momentumExhaustion = this.calculateMomentumExhaustion(
          candles, 
          precedingStart, 
          precedingEnd
        );

        const volumeConfirmation = this.checkReversalVolumeConfirmation(
          candles, 
          reversalIndex, 
          precedingStart, 
          precedingEnd
        );

        const candleStrength = this.calculateCandleStrength(candles, reversalIndex);

        const confidence = this.calculateThreeLineStrikeConfidence({
          precedingMovement: precedingAnalysis.movementSize,
          reversalMovement,
          negationRatio,
          precedingDuration,
          momentumExhaustion,
          volumeConfirmation,
          candleStrength,
          momentumLossConfirmed: precedingAnalysis.momentumLoss
        });

        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestResult = {
            isDetected: confidence >= this.config.confidenceThreshold,
            confidence,
            patternType: 'three_line_strike_bullish',
            precedingStart: {
              index: precedingStart,
              price: this.safeParseFloat(candles[precedingStart].high),
              timestamp: candles[precedingStart].timestamp,
              volume: candles[precedingStart].volume,
              isHigh: true
            },
            precedingEnd: {
              index: precedingEnd,
              price: this.safeParseFloat(candles[precedingEnd].low),
              timestamp: candles[precedingEnd].timestamp,
              volume: candles[precedingEnd].volume,
              isHigh: false
            },
            reversalCandle: {
              index: reversalIndex,
              price: reversalClose,
              timestamp: reversalCandle.timestamp,
              volume: reversalCandle.volume,
              isHigh: true
            },
            metadata: {
              precedingMovement: precedingAnalysis.movementSize,
              reversalMovement,
              negationRatio,
              precedingDuration,
              momentumLossConfirmed: precedingAnalysis.momentumLoss,
              volumeConfirmation,
              candleStrength,
              momentumExhaustion,
              requiresConfirmation: true
            }
          };
        }
      }

      return bestResult || this.createEmptyThreeLineStrikeResult('three_line_strike_bullish');

    } catch (error) {
      console.warn(`Error analyzing bullish Three Line Strike at index ${reversalIndex}: ${error}`);
      return this.createEmptyThreeLineStrikeResult('three_line_strike_bullish');
    }
  }

  /**
   * Analyze preceding movement in the given window
   */
  private analyzePrecedingMovement(
    candles: OHLCVCandles[], 
    startIndex: number, 
    endIndex: number, 
    expectingUpward: boolean
  ): { movementSize: number; momentumLoss: boolean } {
    if (startIndex >= endIndex || endIndex >= candles.length) {
      return { movementSize: 0, momentumLoss: false };
    }

    let totalMovement = 0;
    let favorableCandles = 0;
    let totalCandles = endIndex - startIndex + 1;

    // Calculate cumulative movement
    for (let i = startIndex; i <= endIndex; i++) {
      const open = this.safeParseFloat(candles[i].open);
      const close = this.safeParseFloat(candles[i].close);
      const candleMove = ((close - open) / open) * 100;

      if (expectingUpward) {
        // For bearish pattern, expect preceding upward movement
        if (candleMove > 0) {
          favorableCandles++;
        }
        totalMovement += candleMove;
      } else {
        // For bullish pattern, expect preceding downward movement
        if (candleMove < 0) {
          favorableCandles++;
        }
        totalMovement -= candleMove; // Make positive for easier comparison
      }
    }

    // Check for momentum loss (declining movement toward the end)
    const momentumLoss = this.detectMomentumLossInPrecedingMovement(
      candles, 
      startIndex, 
      endIndex, 
      expectingUpward
    );

    return {
      movementSize: Math.abs(totalMovement),
      momentumLoss
    };
  }

  /**
   * Detect momentum loss in preceding movement
   * Riley's key: Look for signs of momentum exhaustion
   */
  private detectMomentumLossInPrecedingMovement(
    candles: OHLCVCandles[], 
    startIndex: number, 
    endIndex: number, 
    expectingUpward: boolean
  ): boolean {
    if (endIndex - startIndex < 2) return false;

    const periodLength = endIndex - startIndex + 1;
    const firstHalf = Math.floor(periodLength / 2);
    const midPoint = startIndex + firstHalf;

    let earlyMomentum = 0;
    let lateMomentum = 0;

    // Calculate momentum in first half
    for (let i = startIndex; i < midPoint; i++) {
      const open = this.safeParseFloat(candles[i].open);
      const close = this.safeParseFloat(candles[i].close);
      const move = ((close - open) / open) * 100;
      earlyMomentum += expectingUpward ? move : -move;
    }

    // Calculate momentum in second half
    for (let i = midPoint; i <= endIndex; i++) {
      const open = this.safeParseFloat(candles[i].open);
      const close = this.safeParseFloat(candles[i].close);
      const move = ((close - open) / open) * 100;
      lateMomentum += expectingUpward ? move : -move;
    }

    // Momentum loss if later period has significantly less momentum
    return lateMomentum < earlyMomentum * this.config.momentumExhaustionThreshold;
  }

  /**
   * Calculate momentum exhaustion score
   */
  private calculateMomentumExhaustion(
    candles: OHLCVCandles[], 
    startIndex: number, 
    endIndex: number
  ): number {
    if (endIndex - startIndex < 2) return 0;

    let exhaustionScore = 0;

    // Check for decreasing candle sizes
    const candleSizes: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const high = this.safeParseFloat(candles[i].high);
      const low = this.safeParseFloat(candles[i].low);
      candleSizes.push(high - low);
    }

    // Calculate if candle sizes are decreasing
    let decreasingCount = 0;
    for (let i = 1; i < candleSizes.length; i++) {
      if (candleSizes[i] < candleSizes[i - 1]) {
        decreasingCount++;
      }
    }

    exhaustionScore += (decreasingCount / (candleSizes.length - 1)) * 30;

    // Check for volume decline
    const volumes: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      volumes.push(candles[i].volume);
    }

    let volumeDeclineCount = 0;
    for (let i = 1; i < volumes.length; i++) {
      if (volumes[i] < volumes[i - 1]) {
        volumeDeclineCount++;
      }
    }

    exhaustionScore += (volumeDeclineCount / (volumes.length - 1)) * 20;

    return Math.min(exhaustionScore, 50); // Max 50 points
  }

  /**
   * Check volume confirmation for reversal candle
   */
  private checkReversalVolumeConfirmation(
    candles: OHLCVCandles[], 
    reversalIndex: number, 
    precedingStart: number, 
    precedingEnd: number
  ): boolean {
    const reversalVolume = candles[reversalIndex].volume;
    const avgPrecedingVolume = this.calculateAverageVolume(candles, precedingStart, precedingEnd);
    
    return reversalVolume > avgPrecedingVolume * this.config.volumeThreshold;
  }

  /**
   * Calculate candle strength relative to recent price range
   */
  private calculateCandleStrength(candles: OHLCVCandles[], candleIndex: number): number {
    const candle = candles[candleIndex];
    const open = this.safeParseFloat(candle.open);
    const close = this.safeParseFloat(candle.close);
    const high = this.safeParseFloat(candle.high);
    const low = this.safeParseFloat(candle.low);

    const candleRange = high - low;
    const candleBody = Math.abs(close - open);

    // Calculate relative to recent average range
    const lookbackPeriod = Math.min(10, candleIndex);
    let totalRange = 0;
    for (let i = Math.max(0, candleIndex - lookbackPeriod); i < candleIndex; i++) {
      const h = this.safeParseFloat(candles[i].high);
      const l = this.safeParseFloat(candles[i].low);
      totalRange += (h - l);
    }

    const avgRange = totalRange / lookbackPeriod;
    return avgRange > 0 ? (candleBody / avgRange) * 100 : 0;
  }

  /**
   * Calculate confidence score for Three Line Strike pattern
   * Focus on Riley's requirement that it needs additional confirmation
   */
  private calculateThreeLineStrikeConfidence(factors: {
    precedingMovement: number;
    reversalMovement: number;
    negationRatio: number;
    precedingDuration: number;
    momentumExhaustion: number;
    volumeConfirmation: boolean;
    candleStrength: number;
    momentumLossConfirmed: boolean;
  }): number {
    let confidence = 0;

    // Size of preceding movement (max 25 points)
    confidence += Math.min(factors.precedingMovement * 2, 25);

    // Negation ratio - how much movement is given back (max 20 points)
    confidence += factors.negationRatio * 20;

    // Reversal candle strength (max 15 points)
    confidence += Math.min(factors.candleStrength * 0.3, 15);

    // Momentum exhaustion before reversal (max 15 points)
    confidence += Math.min(factors.momentumExhaustion * 0.3, 15);

    // Volume confirmation (10 points)
    if (factors.volumeConfirmation) {
      confidence += 10;
    }

    // Momentum loss in preceding movement (10 points)
    if (factors.momentumLossConfirmed) {
      confidence += 10;
    }

    // Optimal preceding duration (5 points)
    const optimalDuration = (this.config.minPrecedingCandles + this.config.maxPrecedingCandles) / 2;
    const durationFactor = 1 - Math.abs(factors.precedingDuration - optimalDuration) / optimalDuration;
    confidence += durationFactor * 5;

    // Riley's requirement: This pattern shouldn't be used alone
    // Reduce confidence to encourage additional confirmation
    confidence *= 0.85; // 15% reduction to reflect need for confirmation

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Create empty Three Line Strike result
   */
  private createEmptyThreeLineStrikeResult(
    patternType: 'three_line_strike_bearish' | 'three_line_strike_bullish'
  ): ThreeLineStrikeResult {
    return {
      isDetected: false,
      confidence: 0,
      patternType,
      metadata: {
        precedingMovement: 0,
        reversalMovement: 0,
        negationRatio: 0,
        precedingDuration: 0,
        momentumLossConfirmed: false,
        volumeConfirmation: false,
        candleStrength: 0,
        momentumExhaustion: 0,
        requiresConfirmation: true
      }
    };
  }

  /**
   * Create pattern signal for Three Line Strike patterns
   */
  private createThreeLineStrikeSignal(
    result: ThreeLineStrikeResult,
    strategyId: string,
    symbol: string,
    timeframe: TimeframeType,
    candles: OHLCVCandles[]
  ): InsertPatternSignal {
    const latestCandle = candles[candles.length - 1];
    
    return {
      strategyId,
      patternType: result.patternType,
      symbol,
      timeframe,
      confidence: result.confidence,
      detectedAt: latestCandle.timestamp,
      metadata: {
        ...result.metadata,
        precedingStart: result.precedingStart,
        precedingEnd: result.precedingEnd,
        reversalCandle: result.reversalCandle,
        detectionMethod: 'three_line_strike_momentum_analysis',
        candleCount: candles.length,
        description: `${result.patternType} pattern with ${result.metadata.negationRatio.toFixed(2)} negation ratio`
      }
    };
  }

  /**
   * Detect bearish trap patterns
   * Focus on strong upward breakout followed by immediate fast reversal
   * Per Riley's specs: Strong move not normal in trend + fast reversal right after
   */
  private detectBearishTrap(candles: OHLCVCandles[]): TrapResult {
    if (candles.length < this.config.minCandles) {
      return this.createEmptyTrapResult('trap_bearish');
    }

    try {
      // Look for potential trap patterns in recent candles
      for (let i = candles.length - 1; i >= this.config.minBreakoutDuration + this.config.maxTimeToReversal; i--) {
        const trapResult = this.analyzeBearishTrapAtPosition(candles, i);
        if (trapResult.isDetected && trapResult.confidence >= this.config.confidenceThreshold) {
          return trapResult;
        }
      }

      return this.createEmptyTrapResult('trap_bearish');
    } catch (error) {
      console.warn(`Error detecting bearish trap: ${error}`);
      return this.createEmptyTrapResult('trap_bearish');
    }
  }

  /**
   * Detect bullish trap patterns  
   * Focus on strong downward breakout followed by immediate fast reversal
   */
  private detectBullishTrap(candles: OHLCVCandles[]): TrapResult {
    if (candles.length < this.config.minCandles) {
      return this.createEmptyTrapResult('trap_bullish');
    }

    try {
      // Look for potential trap patterns in recent candles
      for (let i = candles.length - 1; i >= this.config.minBreakoutDuration + this.config.maxTimeToReversal; i--) {
        const trapResult = this.analyzeBullishTrapAtPosition(candles, i);
        if (trapResult.isDetected && trapResult.confidence >= this.config.confidenceThreshold) {
          return trapResult;
        }
      }

      return this.createEmptyTrapResult('trap_bullish');
    } catch (error) {
      console.warn(`Error detecting bullish trap: ${error}`);
      return this.createEmptyTrapResult('trap_bullish');
    }
  }

  /**
   * Analyze bearish trap pattern at specific position
   * Strong upward breakout followed by fast downward reversal
   */
  private analyzeBearishTrapAtPosition(candles: OHLCVCandles[], currentIndex: number): TrapResult {
    // Find recent consolidation/chop range  
    const chopAnalysis = this.analyzeRecentChop(candles, currentIndex, true); // true for bearish
    if (!chopAnalysis.hasValidChop) {
      return this.createEmptyTrapResult('trap_bearish');
    }

    // Look for strong upward breakout through chop range
    const breakoutAnalysis = this.findStrongBreakout(candles, chopAnalysis.chopEndIndex, currentIndex, true);
    if (!breakoutAnalysis.hasBreakout) {
      return this.createEmptyTrapResult('trap_bearish');
    }

    // Look for immediate fast reversal after breakout
    const reversalAnalysis = this.findImmediateReversal(candles, breakoutAnalysis.breakoutEndIndex, currentIndex, true);
    if (!reversalAnalysis.hasReversal) {
      return this.createEmptyTrapResult('trap_bearish');
    }

    // Check if reversal velocity equals or exceeds breakout velocity (Riley's key requirement)
    const velocityRatio = reversalAnalysis.reversalVelocity / breakoutAnalysis.breakoutVelocity;
    if (velocityRatio < this.config.minReversalVelocityRatio) {
      return this.createEmptyTrapResult('trap_bearish');
    }

    // Check proximity to support/resistance levels
    const srProximity = this.calculateSupportResistanceProximity(candles, currentIndex, false); // false = resistance for bearish

    // Calculate confidence based on Riley's criteria
    const confidence = this.calculateTrapConfidence({
      breakoutStrength: breakoutAnalysis.breakoutStrength,
      velocityRatio,
      timeToReversal: reversalAnalysis.timeToReversal,
      isBreakoutAbnormal: breakoutAnalysis.isAbnormal,
      supportResistanceProximity: srProximity.proximity,
      chopBreakConfirmed: chopAnalysis.breakConfirmed,
      chopRange: chopAnalysis.chopRange
    });

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType: 'trap_bearish',
      breakoutStart: {
        index: breakoutAnalysis.breakoutStartIndex,
        price: this.safeParseFloat(candles[breakoutAnalysis.breakoutStartIndex].low),
        timestamp: candles[breakoutAnalysis.breakoutStartIndex].timestamp,
        volume: candles[breakoutAnalysis.breakoutStartIndex].volume,
        isHigh: false
      },
      breakoutEnd: {
        index: breakoutAnalysis.breakoutEndIndex,
        price: this.safeParseFloat(candles[breakoutAnalysis.breakoutEndIndex].high),
        timestamp: candles[breakoutAnalysis.breakoutEndIndex].timestamp,
        volume: candles[breakoutAnalysis.breakoutEndIndex].volume,
        isHigh: true
      },
      reversalStart: {
        index: reversalAnalysis.reversalStartIndex,
        price: this.safeParseFloat(candles[reversalAnalysis.reversalStartIndex].high),
        timestamp: candles[reversalAnalysis.reversalStartIndex].timestamp,
        volume: candles[reversalAnalysis.reversalStartIndex].volume,
        isHigh: true
      },
      reversalEnd: {
        index: currentIndex,
        price: this.safeParseFloat(candles[currentIndex].low),
        timestamp: candles[currentIndex].timestamp,
        volume: candles[currentIndex].volume,
        isHigh: false
      },
      supportResistanceLevel: srProximity.level,
      recentChopHigh: chopAnalysis.chopHigh,
      recentChopLow: chopAnalysis.chopLow,
      metadata: {
        breakoutStrength: breakoutAnalysis.breakoutStrength,
        breakoutVelocity: breakoutAnalysis.breakoutVelocity,
        reversalVelocity: reversalAnalysis.reversalVelocity,
        velocityRatio,
        timeToReversal: reversalAnalysis.timeToReversal,
        breakoutDuration: breakoutAnalysis.breakoutEndIndex - breakoutAnalysis.breakoutStartIndex + 1,
        reversalDuration: currentIndex - reversalAnalysis.reversalStartIndex + 1,
        isBreakoutAbnormal: breakoutAnalysis.isAbnormal,
        isReversalImmediate: reversalAnalysis.timeToReversal <= this.config.maxTimeToReversal,
        supportResistanceProximity: srProximity.proximity,
        chopBreakConfirmed: chopAnalysis.breakConfirmed,
        chopRange: chopAnalysis.chopRange
      }
    };
  }

  /**
   * Analyze bullish trap pattern at specific position
   * Strong downward breakout followed by fast upward reversal
   */
  private analyzeBullishTrapAtPosition(candles: OHLCVCandles[], currentIndex: number): TrapResult {
    // Find recent consolidation/chop range
    const chopAnalysis = this.analyzeRecentChop(candles, currentIndex, false); // false for bullish
    if (!chopAnalysis.hasValidChop) {
      return this.createEmptyTrapResult('trap_bullish');
    }

    // Look for strong downward breakout through chop range
    const breakoutAnalysis = this.findStrongBreakout(candles, chopAnalysis.chopEndIndex, currentIndex, false);
    if (!breakoutAnalysis.hasBreakout) {
      return this.createEmptyTrapResult('trap_bullish');
    }

    // Look for immediate fast reversal after breakout
    const reversalAnalysis = this.findImmediateReversal(candles, breakoutAnalysis.breakoutEndIndex, currentIndex, false);
    if (!reversalAnalysis.hasReversal) {
      return this.createEmptyTrapResult('trap_bullish');
    }

    // Check if reversal velocity equals or exceeds breakout velocity
    const velocityRatio = reversalAnalysis.reversalVelocity / breakoutAnalysis.breakoutVelocity;
    if (velocityRatio < this.config.minReversalVelocityRatio) {
      return this.createEmptyTrapResult('trap_bullish');
    }

    // Check proximity to support/resistance levels
    const srProximity = this.calculateSupportResistanceProximity(candles, currentIndex, true); // true = support for bullish

    // Calculate confidence
    const confidence = this.calculateTrapConfidence({
      breakoutStrength: breakoutAnalysis.breakoutStrength,
      velocityRatio,
      timeToReversal: reversalAnalysis.timeToReversal,
      isBreakoutAbnormal: breakoutAnalysis.isAbnormal,
      supportResistanceProximity: srProximity.proximity,
      chopBreakConfirmed: chopAnalysis.breakConfirmed,
      chopRange: chopAnalysis.chopRange
    });

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType: 'trap_bullish',
      breakoutStart: {
        index: breakoutAnalysis.breakoutStartIndex,
        price: this.safeParseFloat(candles[breakoutAnalysis.breakoutStartIndex].high),
        timestamp: candles[breakoutAnalysis.breakoutStartIndex].timestamp,
        volume: candles[breakoutAnalysis.breakoutStartIndex].volume,
        isHigh: true
      },
      breakoutEnd: {
        index: breakoutAnalysis.breakoutEndIndex,
        price: this.safeParseFloat(candles[breakoutAnalysis.breakoutEndIndex].low),
        timestamp: candles[breakoutAnalysis.breakoutEndIndex].timestamp,
        volume: candles[breakoutAnalysis.breakoutEndIndex].volume,
        isHigh: false
      },
      reversalStart: {
        index: reversalAnalysis.reversalStartIndex,
        price: this.safeParseFloat(candles[reversalAnalysis.reversalStartIndex].low),
        timestamp: candles[reversalAnalysis.reversalStartIndex].timestamp,
        volume: candles[reversalAnalysis.reversalStartIndex].volume,
        isHigh: false
      },
      reversalEnd: {
        index: currentIndex,
        price: this.safeParseFloat(candles[currentIndex].high),
        timestamp: candles[currentIndex].timestamp,
        volume: candles[currentIndex].volume,
        isHigh: true
      },
      supportResistanceLevel: srProximity.level,
      recentChopHigh: chopAnalysis.chopHigh,
      recentChopLow: chopAnalysis.chopLow,
      metadata: {
        breakoutStrength: breakoutAnalysis.breakoutStrength,
        breakoutVelocity: breakoutAnalysis.breakoutVelocity,
        reversalVelocity: reversalAnalysis.reversalVelocity,
        velocityRatio,
        timeToReversal: reversalAnalysis.timeToReversal,
        breakoutDuration: breakoutAnalysis.breakoutEndIndex - breakoutAnalysis.breakoutStartIndex + 1,
        reversalDuration: currentIndex - reversalAnalysis.reversalStartIndex + 1,
        isBreakoutAbnormal: breakoutAnalysis.isAbnormal,
        isReversalImmediate: reversalAnalysis.timeToReversal <= this.config.maxTimeToReversal,
        supportResistanceProximity: srProximity.proximity,
        chopBreakConfirmed: chopAnalysis.breakConfirmed,
        chopRange: chopAnalysis.chopRange
      }
    };
  }

  /**
   * Analyze recent consolidation/chop patterns
   * Riley's spec: Break the most recent chop before the trap
   */
  private analyzeRecentChop(candles: OHLCVCandles[], currentIndex: number, isBearish: boolean): {
    hasValidChop: boolean;
    chopStartIndex: number;
    chopEndIndex: number;
    chopHigh: number;
    chopLow: number;
    chopRange: number;
    breakConfirmed: boolean;
  } {
    const lookbackStart = Math.max(0, currentIndex - this.config.chopDetectionPeriod);
    
    let chopHigh = -Infinity;
    let chopLow = Infinity;
    let chopStartIndex = lookbackStart;
    let chopEndIndex = currentIndex - this.config.maxBreakoutDuration;

    // Find the consolidation range
    for (let i = lookbackStart; i <= chopEndIndex; i++) {
      const high = this.safeParseFloat(candles[i].high);
      const low = this.safeParseFloat(candles[i].low);
      
      if (high > chopHigh) chopHigh = high;
      if (low < chopLow) chopLow = low;
    }

    const chopRange = ((chopHigh - chopLow) / chopLow) * 100;
    
    // Check if chop range meets minimum size
    if (chopRange < this.config.minChopBreakSize) {
      return {
        hasValidChop: false,
        chopStartIndex,
        chopEndIndex,
        chopHigh,
        chopLow,
        chopRange,
        breakConfirmed: false
      };
    }

    // Check if the breakout actually broke through the chop
    let breakConfirmed = false;
    for (let i = chopEndIndex + 1; i <= currentIndex; i++) {
      const high = this.safeParseFloat(candles[i].high);
      const low = this.safeParseFloat(candles[i].low);
      
      if (isBearish && high > chopHigh) {
        breakConfirmed = true;
        break;
      } else if (!isBearish && low < chopLow) {
        breakConfirmed = true;
        break;
      }
    }

    return {
      hasValidChop: true,
      chopStartIndex,
      chopEndIndex,
      chopHigh,
      chopLow,
      chopRange,
      breakConfirmed
    };
  }

  /**
   * Find strong breakout that's abnormal compared to recent trend
   * Riley's spec: Strong move not normal in current trend
   */
  private findStrongBreakout(candles: OHLCVCandles[], startIndex: number, endIndex: number, isBearish: boolean): {
    hasBreakout: boolean;
    breakoutStartIndex: number;
    breakoutEndIndex: number;
    breakoutStrength: number;
    breakoutVelocity: number;
    isAbnormal: boolean;
  } {
    // Analyze recent trend strength to determine what's "normal"
    const trendAnalysis = this.analyzeTrendStrength(candles, Math.max(0, startIndex - this.config.trendAnalysisPeriod), startIndex);
    
    // Look for breakout moves within the specified range
    for (let breakoutStart = startIndex; breakoutStart < endIndex - this.config.minBreakoutDuration; breakoutStart++) {
      for (let breakoutEnd = breakoutStart + this.config.minBreakoutDuration; 
           breakoutEnd <= Math.min(breakoutStart + this.config.maxBreakoutDuration, endIndex); 
           breakoutEnd++) {
        
        const breakoutStrength = this.calculateMoveStrength(candles, breakoutStart, breakoutEnd, isBearish);
        const breakoutVelocity = this.calculateMoveVelocity(candles, breakoutStart, breakoutEnd, isBearish);
        
        // Check if this breakout is stronger than normal trend
        const isAbnormal = breakoutStrength > trendAnalysis.normalMoveSize * (1 + this.config.minBreakoutStrength / 100);
        
        if (isAbnormal && breakoutStrength >= this.config.minBreakoutStrength) {
          return {
            hasBreakout: true,
            breakoutStartIndex: breakoutStart,
            breakoutEndIndex: breakoutEnd,
            breakoutStrength,
            breakoutVelocity,
            isAbnormal
          };
        }
      }
    }

    return {
      hasBreakout: false,
      breakoutStartIndex: startIndex,
      breakoutEndIndex: startIndex,
      breakoutStrength: 0,
      breakoutVelocity: 0,
      isAbnormal: false
    };
  }

  /**
   * Find immediate reversal after breakout  
   * Riley's spec: Reversal right after strong breakout, just as fast or faster
   */
  private findImmediateReversal(candles: OHLCVCandles[], breakoutEndIndex: number, currentIndex: number, isBearish: boolean): {
    hasReversal: boolean;
    reversalStartIndex: number;
    reversalVelocity: number;
    timeToReversal: number;
  } {
    // Look for reversal starting within maxTimeToReversal candles after breakout
    for (let reversalStart = breakoutEndIndex; reversalStart <= Math.min(breakoutEndIndex + this.config.maxTimeToReversal, currentIndex - 1); reversalStart++) {
      const timeToReversal = reversalStart - breakoutEndIndex;
      const reversalVelocity = this.calculateMoveVelocity(candles, reversalStart, currentIndex, !isBearish); // Opposite direction
      
      if (reversalVelocity > 0) {
        return {
          hasReversal: true,
          reversalStartIndex: reversalStart,
          reversalVelocity,
          timeToReversal
        };
      }
    }

    return {
      hasReversal: false,
      reversalStartIndex: breakoutEndIndex,
      reversalVelocity: 0,
      timeToReversal: this.config.maxTimeToReversal + 1
    };
  }

  /**
   * Calculate proximity to support/resistance levels
   * Riley's spec: Near support/resistance but doesn't need to break major levels
   */
  private calculateSupportResistanceProximity(candles: OHLCVCandles[], currentIndex: number, isSupport: boolean): {
    proximity: number;
    level: number;
  } {
    const lookbackPeriod = Math.min(this.config.lookbackPeriod, currentIndex);
    const currentPrice = isSupport ? 
      this.safeParseFloat(candles[currentIndex].low) : 
      this.safeParseFloat(candles[currentIndex].high);

    // Find significant support/resistance levels
    const levels: number[] = [];
    
    for (let i = Math.max(0, currentIndex - lookbackPeriod); i < currentIndex; i++) {
      const high = this.safeParseFloat(candles[i].high);
      const low = this.safeParseFloat(candles[i].low);
      
      if (isSupport) {
        levels.push(low);
      } else {
        levels.push(high);
      }
    }

    // Find the nearest level
    let nearestLevel = levels[0];
    let minDistance = Math.abs(currentPrice - nearestLevel);

    for (const level of levels) {
      const distance = Math.abs(currentPrice - level);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = level;
      }
    }

    const proximityPercentage = (minDistance / currentPrice) * 100;

    return {
      proximity: proximityPercentage,
      level: nearestLevel
    };
  }

  /**
   * Analyze trend strength over a period to determine "normal" move size
   */
  private analyzeTrendStrength(candles: OHLCVCandles[], startIndex: number, endIndex: number): {
    normalMoveSize: number;
    averageVelocity: number;
  } {
    const moves: number[] = [];
    const velocities: number[] = [];

    for (let i = startIndex; i < endIndex - 1; i++) {
      const moveSize = this.calculateMoveStrength(candles, i, i + 1, true); // Use bearish as default
      const velocity = this.calculateMoveVelocity(candles, i, i + 1, true);
      
      moves.push(moveSize);
      velocities.push(velocity);
    }

    const normalMoveSize = moves.length > 0 ? moves.reduce((a, b) => a + b, 0) / moves.length : 0;
    const averageVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;

    return {
      normalMoveSize,
      averageVelocity
    };
  }

  /**
   * Calculate move strength (percentage change)
   */
  private calculateMoveStrength(candles: OHLCVCandles[], startIndex: number, endIndex: number, isBearish: boolean): number {
    const startPrice = isBearish ? 
      this.safeParseFloat(candles[startIndex].low) : 
      this.safeParseFloat(candles[startIndex].high);
    const endPrice = isBearish ? 
      this.safeParseFloat(candles[endIndex].high) : 
      this.safeParseFloat(candles[endIndex].low);

    return Math.abs(((endPrice - startPrice) / startPrice) * 100);
  }

  /**
   * Calculate move velocity (price change per candle)
   */
  private calculateMoveVelocity(candles: OHLCVCandles[], startIndex: number, endIndex: number, isBearish: boolean): number {
    const moveStrength = this.calculateMoveStrength(candles, startIndex, endIndex, isBearish);
    const duration = Math.max(1, endIndex - startIndex);
    return moveStrength / duration;
  }

  /**
   * Calculate confidence score for trap patterns
   * Focus on Riley's key factors: breakout strength, velocity ratio, timing
   */
  private calculateTrapConfidence(factors: {
    breakoutStrength: number;
    velocityRatio: number;
    timeToReversal: number;
    isBreakoutAbnormal: boolean;
    supportResistanceProximity: number;
    chopBreakConfirmed: boolean;
    chopRange: number;
  }): number {
    let confidence = 0;

    // Breakout strength vs normal trend (max 25 points)
    confidence += Math.min(factors.breakoutStrength * 2, 25);

    // Velocity ratio - reversal should match or exceed breakout (max 25 points)
    const velocityScore = Math.min(factors.velocityRatio * 25, 25);
    confidence += velocityScore;

    // Time to reversal - faster is better (max 20 points)
    const timeScore = Math.max(0, 20 - (factors.timeToReversal * 5));
    confidence += timeScore;

    // Abnormal breakout bonus (15 points)
    if (factors.isBreakoutAbnormal) {
      confidence += 15;
    }

    // Support/resistance proximity (max 10 points)
    const proximityScore = Math.max(0, 10 - factors.supportResistanceProximity);
    confidence += proximityScore;

    // Chop break confirmation (5 points)
    if (factors.chopBreakConfirmed) {
      confidence += 5;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Create empty trap result
   */
  private createEmptyTrapResult(patternType: 'trap_bearish' | 'trap_bullish'): TrapResult {
    return {
      isDetected: false,
      confidence: 0,
      patternType,
      metadata: {
        breakoutStrength: 0,
        breakoutVelocity: 0,
        reversalVelocity: 0,
        velocityRatio: 0,
        timeToReversal: 0,
        breakoutDuration: 0,
        reversalDuration: 0,
        isBreakoutAbnormal: false,
        isReversalImmediate: false,
        supportResistanceProximity: 0,
        chopBreakConfirmed: false,
        chopRange: 0
      }
    };
  }

  /**
   * Create pattern signal for trap patterns
   */
  private createTrapSignal(
    result: TrapResult,
    strategyId: string,
    symbol: string,
    timeframe: TimeframeType,
    candles: OHLCVCandles[]
  ): InsertPatternSignal {
    const latestCandle = candles[candles.length - 1];
    const currentPrice = this.safeParseFloat(latestCandle.close);

    return {
      strategyId,
      symbol,
      timeframe,
      patternType: result.patternType,
      confidence: result.confidence,
      price: currentPrice.toString(),
      detectedAt: latestCandle.timestamp,
      metadata: {
        ...result.metadata,
        breakoutStart: result.breakoutStart ? {
          index: result.breakoutStart.index,
          price: result.breakoutStart.price,
          timestamp: result.breakoutStart.timestamp.toISOString()
        } : undefined,
        breakoutEnd: result.breakoutEnd ? {
          index: result.breakoutEnd.index,
          price: result.breakoutEnd.price,
          timestamp: result.breakoutEnd.timestamp.toISOString()
        } : undefined,
        reversalStart: result.reversalStart ? {
          index: result.reversalStart.index,
          price: result.reversalStart.price,
          timestamp: result.reversalStart.timestamp.toISOString()
        } : undefined,
        reversalEnd: result.reversalEnd ? {
          index: result.reversalEnd.index,
          price: result.reversalEnd.price,
          timestamp: result.reversalEnd.timestamp.toISOString()
        } : undefined,
        supportResistanceLevel: result.supportResistanceLevel,
        recentChopHigh: result.recentChopHigh,
        recentChopLow: result.recentChopLow
      }
    };
  }

  // ========================= REVERSAL CANDLESTICK PATTERN DETECTION =========================

  /**
   * Detect reversal candlestick patterns (Hammer, Doji, Engulfing, etc.)
   * Focus on momentum and rejection analysis per Riley's approach
   */
  private detectReversalCandlestickPatterns(candles: OHLCVCandles[]): ReversalCandlestickResult[] {
    if (candles.length < 3) {
      return [];
    }

    const patterns: ReversalCandlestickResult[] = [];

    // Analyze last few candles for reversal patterns
    for (let i = candles.length - 3; i < candles.length; i++) {
      if (i < 2) continue; // Need at least 2 previous candles for context

      // Single candle patterns
      const hammerResult = this.detectHammerPattern(candles, i);
      if (hammerResult.isDetected) patterns.push(hammerResult);

      const dojiResult = this.detectDojiPattern(candles, i);
      if (dojiResult.isDetected) patterns.push(dojiResult);

      const shootingStarResult = this.detectShootingStarPattern(candles, i);
      if (shootingStarResult.isDetected) patterns.push(shootingStarResult);

      // Two candle patterns
      if (i > 0) {
        const engulfingResult = this.detectEngulfingPattern(candles, i);
        if (engulfingResult.isDetected) patterns.push(engulfingResult);

        const piercingResult = this.detectPiercingPattern(candles, i);
        if (piercingResult.isDetected) patterns.push(piercingResult);
      }

      // Three candle patterns  
      if (i > 1) {
        const morningStarResult = this.detectMorningStarPattern(candles, i);
        if (morningStarResult.isDetected) patterns.push(morningStarResult);

        const eveningStarResult = this.detectEveningStarPattern(candles, i);
        if (eveningStarResult.isDetected) patterns.push(eveningStarResult);
      }
    }

    return patterns.filter(p => p.confidence >= this.config.confidenceThreshold);
  }

  /**
   * Detect Hammer and Inverted Hammer patterns
   * Focus on rejection strength and support/resistance context
   */
  private detectHammerPattern(candles: OHLCVCandles[], index: number): ReversalCandlestickResult {
    const candle = candles[index];
    const open = this.safeParseFloat(candle.open);
    const high = this.safeParseFloat(candle.high);
    const low = this.safeParseFloat(candle.low);
    const close = this.safeParseFloat(candle.close);

    const bodySize = Math.abs(close - open);
    const totalRange = high - low;
    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;

    // Determine if hammer (bullish) or hanging man (bearish) based on trend context
    const trendContext = this.determineTrendContext(candles, index);
    const isHammer = (trendContext === 'downtrend' && lowerWick > upperWick * this.config.minWickToBodyRatio);
    const isInvertedHammer = (trendContext === 'downtrend' && upperWick > lowerWick * this.config.minWickToBodyRatio);
    const isHangingMan = (trendContext === 'uptrend' && lowerWick > upperWick * this.config.minWickToBodyRatio);

    if (!isHammer && !isInvertedHammer && !isHangingMan) {
      return this.createEmptyReversalCandlestickResult();
    }

    // Riley's focus: rejection strength and meaningful context
    const rejectionWick = isHammer || isHangingMan ? lowerWick : upperWick;
    const wickToBodyRatio = bodySize > 0 ? rejectionWick / bodySize : 0;
    const rejectionStrength = (rejectionWick / totalRange) * 100;

    // Context validation - pattern should occur near support/resistance
    const supportResistanceLevel = this.findNearestSupportResistance(candles, index, isHammer || isInvertedHammer);
    const proximityToSR = supportResistanceLevel ? 
      Math.abs(close - supportResistanceLevel) / close * 100 : 100;

    // Volume confirmation
    const volumeConfirmation = this.checkVolumeConfirmation(candles, [index]);
    const recentVolatility = this.calculateRecentVolatility(candles, index);
    const averageBodySize = this.calculateAverageBodySize(candles, index, 10);

    let confidence = 0;

    // Core pattern requirements
    if (wickToBodyRatio >= this.config.minWickToBodyRatio && rejectionStrength >= this.config.minRejectionSize) {
      confidence += 30;
      
      // Context bonus
      if (proximityToSR <= 2.0) confidence += 25; // Near support/resistance
      if (volumeConfirmation) confidence += 15; // Volume confirmation
      if (bodySize >= averageBodySize * this.config.minBodySizeRatio) confidence += 10; // Significant body
      if (recentVolatility > averageBodySize * 1.5) confidence += 10; // High volatility context
      if (rejectionStrength > 5.0) confidence += 10; // Strong rejection
    }

    const patternType = isHammer ? 'hammer_bullish' : 
                      isInvertedHammer ? 'inverted_hammer_bullish' : 'hanging_man_bearish';

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType,
      candle: {
        index,
        price: close,
        timestamp: candle.timestamp,
        volume: candle.volume,
        isHigh: false
      },
      supportResistanceLevel,
      metadata: {
        bodySize: (bodySize / averageBodySize) * 100,
        upperWickSize: upperWick / (bodySize || 0.01),
        lowerWickSize: lowerWick / (bodySize || 0.01),
        rejectionStrength,
        trendContext,
        supportResistanceProximity: proximityToSR,
        volumeConfirmation,
        momentumExhaustion: this.calculateMomentumExhaustion(candles, index),
        recentVolatility,
        candleStrength: bodySize / averageBodySize,
        contextValidation: proximityToSR <= 2.0,
        patternCompleted: true,
        requiresConfirmation: true
      }
    };
  }

  /**
   * Detect Doji patterns (regular, dragonfly, gravestone)
   * Focus on indecision and momentum exhaustion
   */
  private detectDojiPattern(candles: OHLCVCandles[], index: number): ReversalCandlestickResult {
    const candle = candles[index];
    const open = this.safeParseFloat(candle.open);
    const high = this.safeParseFloat(candle.high);
    const low = this.safeParseFloat(candle.low);
    const close = this.safeParseFloat(candle.close);

    const bodySize = Math.abs(close - open);
    const totalRange = high - low;
    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;
    const averageBodySize = this.calculateAverageBodySize(candles, index, 10);

    // Doji identification: very small body relative to range
    const bodyToRangeRatio = totalRange > 0 ? (bodySize / totalRange) * 100 : 0;
    if (bodyToRangeRatio > this.config.dojiBodyThreshold) {
      return this.createEmptyReversalCandlestickResult();
    }

    const trendContext = this.determineTrendContext(candles, index);
    
    // Determine doji type based on wick characteristics
    let patternType: any = 'doji_reversal';
    if (lowerWick > upperWick * 2 && lowerWick > totalRange * 0.6) {
      patternType = 'dragonfly_doji_bullish';
    } else if (upperWick > lowerWick * 2 && upperWick > totalRange * 0.6) {
      patternType = 'gravestone_doji_bearish';
    }

    // Riley's focus: momentum exhaustion and context
    const momentumExhaustion = this.calculateMomentumExhaustion(candles, index);
    const supportResistanceLevel = this.findNearestSupportResistance(candles, index, 
      patternType === 'dragonfly_doji_bullish');
    const proximityToSR = supportResistanceLevel ? 
      Math.abs(close - supportResistanceLevel) / close * 100 : 100;

    const volumeConfirmation = this.checkVolumeConfirmation(candles, [index]);
    const recentVolatility = this.calculateRecentVolatility(candles, index);

    let confidence = 0;

    // Core doji requirements
    if (bodyToRangeRatio <= this.config.dojiBodyThreshold && totalRange > averageBodySize * 0.5) {
      confidence += 40;
      
      // Context and momentum factors
      if (momentumExhaustion > 0.6) confidence += 20; // High momentum exhaustion
      if (proximityToSR <= 1.5) confidence += 20; // Very close to S/R
      if (volumeConfirmation) confidence += 10; // Volume confirmation
      if (recentVolatility > averageBodySize) confidence += 10; // Volatile context
    }

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType,
      candle: {
        index,
        price: close,
        timestamp: candle.timestamp,
        volume: candle.volume,
        isHigh: false
      },
      supportResistanceLevel,
      metadata: {
        bodySize: (bodySize / averageBodySize) * 100,
        upperWickSize: upperWick / (bodySize || 0.01),
        lowerWickSize: lowerWick / (bodySize || 0.01),
        rejectionStrength: (Math.max(upperWick, lowerWick) / totalRange) * 100,
        trendContext,
        supportResistanceProximity: proximityToSR,
        volumeConfirmation,
        momentumExhaustion,
        recentVolatility,
        candleStrength: totalRange / averageBodySize,
        contextValidation: proximityToSR <= 2.0,
        patternCompleted: true,
        requiresConfirmation: true
      }
    };
  }

  /**
   * Detect Shooting Star patterns
   * Focus on rejection from highs in uptrends
   */
  private detectShootingStarPattern(candles: OHLCVCandles[], index: number): ReversalCandlestickResult {
    const candle = candles[index];
    const open = this.safeParseFloat(candle.open);
    const high = this.safeParseFloat(candle.high);
    const low = this.safeParseFloat(candle.low);
    const close = this.safeParseFloat(candle.close);

    const bodySize = Math.abs(close - open);
    const totalRange = high - low;
    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;

    const trendContext = this.determineTrendContext(candles, index);
    
    // Shooting star: long upper wick, small body, small lower wick, in uptrend
    if (trendContext !== 'uptrend') {
      return this.createEmptyReversalCandlestickResult();
    }

    const wickToBodyRatio = bodySize > 0 ? upperWick / bodySize : 0;
    const upperWickRatio = totalRange > 0 ? upperWick / totalRange : 0;
    
    if (wickToBodyRatio < this.config.minWickToBodyRatio || upperWickRatio < 0.6) {
      return this.createEmptyReversalCandlestickResult();
    }

    // Riley's focus: strong rejection from highs
    const rejectionStrength = upperWickRatio * 100;
    const supportResistanceLevel = this.findNearestSupportResistance(candles, index, false);
    const proximityToSR = supportResistanceLevel ? 
      Math.abs(high - supportResistanceLevel) / high * 100 : 100;

    const volumeConfirmation = this.checkVolumeConfirmation(candles, [index]);
    const momentumExhaustion = this.calculateMomentumExhaustion(candles, index);
    const averageBodySize = this.calculateAverageBodySize(candles, index, 10);

    let confidence = 0;

    // Core shooting star requirements
    if (wickToBodyRatio >= this.config.minWickToBodyRatio && rejectionStrength >= 60) {
      confidence += 35;
      
      // Context factors
      if (proximityToSR <= 2.0) confidence += 25; // Near resistance
      if (volumeConfirmation) confidence += 15; // Volume confirmation  
      if (momentumExhaustion > 0.5) confidence += 15; // Momentum exhaustion
      if (lowerWick <= bodySize * 0.3) confidence += 10; // Small lower wick
    }

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType: 'shooting_star_bearish',
      candle: {
        index,
        price: close,
        timestamp: candle.timestamp,
        volume: candle.volume,
        isHigh: true
      },
      supportResistanceLevel,
      metadata: {
        bodySize: (bodySize / averageBodySize) * 100,
        upperWickSize: upperWick / (bodySize || 0.01),
        lowerWickSize: lowerWick / (bodySize || 0.01),
        rejectionStrength,
        trendContext,
        supportResistanceProximity: proximityToSR,
        volumeConfirmation,
        momentumExhaustion,
        recentVolatility: this.calculateRecentVolatility(candles, index),
        candleStrength: bodySize / averageBodySize,
        contextValidation: proximityToSR <= 2.0,
        patternCompleted: true,
        requiresConfirmation: true
      }
    };
  }

  /**
   * Detect Engulfing patterns (bullish/bearish)
   * Focus on momentum shift and body size relationship
   */
  private detectEngulfingPattern(candles: OHLCVCandles[], index: number): ReversalCandlestickResult {
    if (index < 1) return this.createEmptyReversalCandlestickResult();

    const currentCandle = candles[index];
    const previousCandle = candles[index - 1];

    const currentOpen = this.safeParseFloat(currentCandle.open);
    const currentClose = this.safeParseFloat(currentCandle.close);
    const prevOpen = this.safeParseFloat(previousCandle.open);
    const prevClose = this.safeParseFloat(previousCandle.close);

    const currentBody = Math.abs(currentClose - currentOpen);
    const prevBody = Math.abs(prevClose - prevOpen);
    const currentIsBullish = currentClose > currentOpen;
    const prevIsBullish = prevClose > prevOpen;

    // Engulfing requirements: opposite colors and current body engulfs previous
    if (currentIsBullish === prevIsBullish) {
      return this.createEmptyReversalCandlestickResult();
    }

    const trendContext = this.determineTrendContext(candles, index);
    const isBullishEngulfing = currentIsBullish && trendContext === 'downtrend';
    const isBearishEngulfing = !currentIsBullish && trendContext === 'uptrend';

    if (!isBullishEngulfing && !isBearishEngulfing) {
      return this.createEmptyReversalCandlestickResult();
    }

    // Check engulfment - current candle body must engulf previous
    const engulfsBody = currentIsBullish ? 
      (currentOpen <= prevClose && currentClose >= prevOpen) :
      (currentOpen >= prevClose && currentClose <= prevOpen);

    if (!engulfsBody) {
      return this.createEmptyReversalCandlestickResult();
    }

    // Riley's focus: significant size and momentum change
    const engulfmentRatio = prevBody > 0 ? currentBody / prevBody : 0;
    const averageBodySize = this.calculateAverageBodySize(candles, index, 10);
    
    const supportResistanceLevel = this.findNearestSupportResistance(candles, index, isBullishEngulfing);
    const proximityToSR = supportResistanceLevel ? 
      Math.abs(currentClose - supportResistanceLevel) / currentClose * 100 : 100;

    const volumeConfirmation = this.checkVolumeConfirmation(candles, [index]);
    const momentumExhaustion = this.calculateMomentumExhaustion(candles, index);

    let confidence = 0;

    // Core engulfing requirements
    if (engulfmentRatio >= this.config.engulfingMinimumRatio && currentBody >= averageBodySize * 0.8) {
      confidence += 40;
      
      // Size and context factors
      if (engulfmentRatio >= 1.5) confidence += 15; // Strong engulfment
      if (proximityToSR <= 2.0) confidence += 20; // Near S/R level
      if (volumeConfirmation) confidence += 15; // Volume confirmation
      if (momentumExhaustion > 0.4) confidence += 10; // Momentum shift
    }

    const patternType = isBullishEngulfing ? 'bullish_engulfing' : 'bearish_engulfing';

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType,
      candle: {
        index,
        price: currentClose,
        timestamp: currentCandle.timestamp,
        volume: currentCandle.volume,
        isHigh: !currentIsBullish
      },
      previousCandle: {
        index: index - 1,
        price: prevClose,
        timestamp: previousCandle.timestamp,
        volume: previousCandle.volume,
        isHigh: prevIsBullish
      },
      supportResistanceLevel,
      metadata: {
        bodySize: (currentBody / averageBodySize) * 100,
        upperWickSize: 0, // Not relevant for engulfing
        lowerWickSize: 0, // Not relevant for engulfing
        rejectionStrength: engulfmentRatio * 50, // Use engulfment as rejection metric
        trendContext,
        supportResistanceProximity: proximityToSR,
        volumeConfirmation,
        momentumExhaustion,
        recentVolatility: this.calculateRecentVolatility(candles, index),
        candleStrength: currentBody / averageBodySize,
        contextValidation: proximityToSR <= 2.0,
        patternCompleted: true,
        requiresConfirmation: false
      }
    };
  }

  /**
   * Detect Piercing Pattern and Dark Cloud Cover
   * Two-candle reversal patterns with partial body penetration
   */
  private detectPiercingPattern(candles: OHLCVCandles[], index: number): ReversalCandlestickResult {
    if (index < 1) return this.createEmptyReversalCandlestickResult();

    const currentCandle = candles[index];
    const previousCandle = candles[index - 1];

    const currentOpen = this.safeParseFloat(currentCandle.open);
    const currentClose = this.safeParseFloat(currentCandle.close);
    const prevOpen = this.safeParseFloat(previousCandle.open);
    const prevClose = this.safeParseFloat(previousCandle.close);

    const currentIsBullish = currentClose > currentOpen;
    const prevIsBullish = prevClose > prevOpen;
    const trendContext = this.determineTrendContext(candles, index);

    // Piercing pattern: bearish candle followed by bullish in downtrend
    // Dark cloud cover: bullish candle followed by bearish in uptrend
    const isPiercing = !prevIsBullish && currentIsBullish && trendContext === 'downtrend';
    const isDarkCloud = prevIsBullish && !currentIsBullish && trendContext === 'uptrend';

    if (!isPiercing && !isDarkCloud) {
      return this.createEmptyReversalCandlestickResult();
    }

    // Check penetration requirements
    const prevBody = Math.abs(prevClose - prevOpen);
    const penetrationLevel = isPiercing ? 
      (prevOpen + prevClose) / 2 : // Piercing: penetrate halfway into prev body
      (prevOpen + prevClose) / 2;  // Dark cloud: same logic

    const hasPenetration = isPiercing ? 
      currentClose > penetrationLevel : 
      currentClose < penetrationLevel;

    if (!hasPenetration) {
      return this.createEmptyReversalCandlestickResult();
    }

    // Riley's focus: strength of penetration and context
    const penetrationRatio = isPiercing ? 
      (currentClose - prevClose) / prevBody :
      (prevClose - currentClose) / prevBody;

    const averageBodySize = this.calculateAverageBodySize(candles, index, 10);
    const supportResistanceLevel = this.findNearestSupportResistance(candles, index, isPiercing);
    const proximityToSR = supportResistanceLevel ? 
      Math.abs(currentClose - supportResistanceLevel) / currentClose * 100 : 100;

    const volumeConfirmation = this.checkVolumeConfirmation(candles, [index]);
    const momentumExhaustion = this.calculateMomentumExhaustion(candles, index);

    let confidence = 0;

    // Core pattern requirements
    if (penetrationRatio >= 0.5 && Math.abs(currentClose - currentOpen) >= averageBodySize * 0.7) {
      confidence += 35;
      
      // Penetration and context factors
      if (penetrationRatio >= 0.7) confidence += 15; // Strong penetration
      if (proximityToSR <= 2.0) confidence += 20; // Near S/R level
      if (volumeConfirmation) confidence += 15; // Volume confirmation
      if (momentumExhaustion > 0.4) confidence += 15; // Momentum shift
    }

    const patternType = isPiercing ? 'piercing_pattern_bullish' : 'dark_cloud_cover_bearish';

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType,
      candle: {
        index,
        price: currentClose,
        timestamp: currentCandle.timestamp,
        volume: currentCandle.volume,
        isHigh: !currentIsBullish
      },
      previousCandle: {
        index: index - 1,
        price: prevClose,
        timestamp: previousCandle.timestamp,
        volume: previousCandle.volume,
        isHigh: prevIsBullish
      },
      supportResistanceLevel,
      metadata: {
        bodySize: (Math.abs(currentClose - currentOpen) / averageBodySize) * 100,
        upperWickSize: 0, // Not primary focus
        lowerWickSize: 0, // Not primary focus
        rejectionStrength: penetrationRatio * 100,
        trendContext,
        supportResistanceProximity: proximityToSR,
        volumeConfirmation,
        momentumExhaustion,
        recentVolatility: this.calculateRecentVolatility(candles, index),
        candleStrength: Math.abs(currentClose - currentOpen) / averageBodySize,
        contextValidation: proximityToSR <= 2.0,
        patternCompleted: true,
        requiresConfirmation: true
      }
    };
  }

  /**
   * Detect Morning Star pattern (three-candle bullish reversal)
   */
  private detectMorningStarPattern(candles: OHLCVCandles[], index: number): ReversalCandlestickResult {
    if (index < 2) return this.createEmptyReversalCandlestickResult();

    const firstCandle = candles[index - 2];
    const starCandle = candles[index - 1];
    const thirdCandle = candles[index];

    const first = {
      open: this.safeParseFloat(firstCandle.open),
      close: this.safeParseFloat(firstCandle.close)
    };
    const star = {
      open: this.safeParseFloat(starCandle.open),
      close: this.safeParseFloat(starCandle.close),
      high: this.safeParseFloat(starCandle.high),
      low: this.safeParseFloat(starCandle.low)
    };
    const third = {
      open: this.safeParseFloat(thirdCandle.open),
      close: this.safeParseFloat(thirdCandle.close)
    };

    const trendContext = this.determineTrendContext(candles, index);
    if (trendContext !== 'downtrend') {
      return this.createEmptyReversalCandlestickResult();
    }

    // Morning star requirements
    const firstIsBearish = first.close < first.open;
    const thirdIsBullish = third.close > third.open;
    const starIsSmall = Math.abs(star.close - star.open) < Math.abs(first.close - first.open) * 0.3;
    
    // Star should gap down from first candle and third should recover
    const gapDown = star.high < first.close;
    const recovery = third.close > (first.open + first.close) / 2;

    if (!firstIsBearish || !thirdIsBullish || !starIsSmall || !gapDown || !recovery) {
      return this.createEmptyReversalCandlestickResult();
    }

    // Riley's focus: strength of reversal and context
    const reversalStrength = (third.close - star.low) / (first.open - star.low);
    const averageBodySize = this.calculateAverageBodySize(candles, index, 10);
    
    const supportResistanceLevel = this.findNearestSupportResistance(candles, index, true);
    const proximityToSR = supportResistanceLevel ? 
      Math.abs(third.close - supportResistanceLevel) / third.close * 100 : 100;

    const volumeConfirmation = this.checkVolumeConfirmation(candles, [index]);
    const momentumExhaustion = this.calculateMomentumExhaustion(candles, index);

    let confidence = 0;

    // Core morning star requirements
    if (reversalStrength >= 0.6 && Math.abs(third.close - third.open) >= averageBodySize * 0.8) {
      confidence += 40;
      
      // Pattern strength factors
      if (reversalStrength >= 0.8) confidence += 15; // Strong recovery
      if (proximityToSR <= 2.0) confidence += 20; // Near support
      if (volumeConfirmation) confidence += 15; // Volume confirmation
      if (momentumExhaustion > 0.5) confidence += 10; // High exhaustion
    }

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType: 'morning_star_bullish',
      candle: {
        index,
        price: third.close,
        timestamp: thirdCandle.timestamp,
        volume: thirdCandle.volume,
        isHigh: false
      },
      previousCandle: {
        index: index - 1,
        price: star.close,
        timestamp: starCandle.timestamp,
        volume: starCandle.volume,
        isHigh: false
      },
      confirmationCandle: {
        index: index - 2,
        price: first.close,
        timestamp: firstCandle.timestamp,
        volume: firstCandle.volume,
        isHigh: false
      },
      supportResistanceLevel,
      metadata: {
        bodySize: (Math.abs(third.close - third.open) / averageBodySize) * 100,
        upperWickSize: 0, // Not primary focus
        lowerWickSize: 0, // Not primary focus
        rejectionStrength: reversalStrength * 100,
        trendContext,
        supportResistanceProximity: proximityToSR,
        volumeConfirmation,
        momentumExhaustion,
        recentVolatility: this.calculateRecentVolatility(candles, index),
        candleStrength: Math.abs(third.close - third.open) / averageBodySize,
        contextValidation: proximityToSR <= 2.0,
        patternCompleted: true,
        requiresConfirmation: false
      }
    };
  }

  /**
   * Detect Evening Star pattern (three-candle bearish reversal)
   */
  private detectEveningStarPattern(candles: OHLCVCandles[], index: number): ReversalCandlestickResult {
    if (index < 2) return this.createEmptyReversalCandlestickResult();

    const firstCandle = candles[index - 2];
    const starCandle = candles[index - 1];
    const thirdCandle = candles[index];

    const first = {
      open: this.safeParseFloat(firstCandle.open),
      close: this.safeParseFloat(firstCandle.close)
    };
    const star = {
      open: this.safeParseFloat(starCandle.open),
      close: this.safeParseFloat(starCandle.close),
      high: this.safeParseFloat(starCandle.high),
      low: this.safeParseFloat(starCandle.low)
    };
    const third = {
      open: this.safeParseFloat(thirdCandle.open),
      close: this.safeParseFloat(thirdCandle.close)
    };

    const trendContext = this.determineTrendContext(candles, index);
    if (trendContext !== 'uptrend') {
      return this.createEmptyReversalCandlestickResult();
    }

    // Evening star requirements (opposite of morning star)
    const firstIsBullish = first.close > first.open;
    const thirdIsBearish = third.close < third.open;
    const starIsSmall = Math.abs(star.close - star.open) < Math.abs(first.close - first.open) * 0.3;
    
    // Star should gap up from first candle and third should decline
    const gapUp = star.low > first.close;
    const decline = third.close < (first.open + first.close) / 2;

    if (!firstIsBullish || !thirdIsBearish || !starIsSmall || !gapUp || !decline) {
      return this.createEmptyReversalCandlestickResult();
    }

    // Riley's focus: strength of reversal and context
    const reversalStrength = (star.high - third.close) / (star.high - first.open);
    const averageBodySize = this.calculateAverageBodySize(candles, index, 10);
    
    const supportResistanceLevel = this.findNearestSupportResistance(candles, index, false);
    const proximityToSR = supportResistanceLevel ? 
      Math.abs(third.close - supportResistanceLevel) / third.close * 100 : 100;

    const volumeConfirmation = this.checkVolumeConfirmation(candles, [index]);
    const momentumExhaustion = this.calculateMomentumExhaustion(candles, index);

    let confidence = 0;

    // Core evening star requirements
    if (reversalStrength >= 0.6 && Math.abs(third.close - third.open) >= averageBodySize * 0.8) {
      confidence += 40;
      
      // Pattern strength factors
      if (reversalStrength >= 0.8) confidence += 15; // Strong decline
      if (proximityToSR <= 2.0) confidence += 20; // Near resistance
      if (volumeConfirmation) confidence += 15; // Volume confirmation
      if (momentumExhaustion > 0.5) confidence += 10; // High exhaustion
    }

    return {
      isDetected: confidence >= this.config.confidenceThreshold,
      confidence,
      patternType: 'evening_star_bearish',
      candle: {
        index,
        price: third.close,
        timestamp: thirdCandle.timestamp,
        volume: thirdCandle.volume,
        isHigh: true
      },
      previousCandle: {
        index: index - 1,
        price: star.close,
        timestamp: starCandle.timestamp,
        volume: starCandle.volume,
        isHigh: true
      },
      confirmationCandle: {
        index: index - 2,
        price: first.close,
        timestamp: firstCandle.timestamp,
        volume: firstCandle.volume,
        isHigh: true
      },
      supportResistanceLevel,
      metadata: {
        bodySize: (Math.abs(third.close - third.open) / averageBodySize) * 100,
        upperWickSize: 0, // Not primary focus
        lowerWickSize: 0, // Not primary focus
        rejectionStrength: reversalStrength * 100,
        trendContext,
        supportResistanceProximity: proximityToSR,
        volumeConfirmation,
        momentumExhaustion,
        recentVolatility: this.calculateRecentVolatility(candles, index),
        candleStrength: Math.abs(third.close - third.open) / averageBodySize,
        contextValidation: proximityToSR <= 2.0,
        patternCompleted: true,
        requiresConfirmation: false
      }
    };
  }

  // ========================= HELPER METHODS FOR CANDLESTICK ANALYSIS =========================

  /**
   * Determine trend context for candlestick pattern validation
   */
  private determineTrendContext(candles: OHLCVCandles[], index: number): 'uptrend' | 'downtrend' | 'sideways' {
    const lookback = Math.min(this.config.trendContextPeriod, index);
    if (lookback < 3) return 'sideways';

    const startIndex = index - lookback;
    const startPrice = this.safeParseFloat(candles[startIndex].close);
    const endPrice = this.safeParseFloat(candles[index].close);
    const priceChange = (endPrice - startPrice) / startPrice;

    // Calculate trend strength
    let upMoves = 0;
    let downMoves = 0;
    
    for (let i = startIndex + 1; i <= index; i++) {
      const prevClose = this.safeParseFloat(candles[i - 1].close);
      const currentClose = this.safeParseFloat(candles[i].close);
      if (currentClose > prevClose) upMoves++;
      else if (currentClose < prevClose) downMoves++;
    }

    const trendStrength = Math.abs(priceChange);
    
    if (trendStrength < 0.02) return 'sideways'; // Less than 2% move
    if (priceChange > 0.02 && upMoves > downMoves) return 'uptrend';
    if (priceChange < -0.02 && downMoves > upMoves) return 'downtrend';
    
    return 'sideways';
  }

  /**
   * Calculate average body size for context
   */
  private calculateAverageBodySize(candles: OHLCVCandles[], index: number, period: number): number {
    const start = Math.max(0, index - period);
    let totalBodySize = 0;
    let count = 0;

    for (let i = start; i < index; i++) {
      const open = this.safeParseFloat(candles[i].open);
      const close = this.safeParseFloat(candles[i].close);
      totalBodySize += Math.abs(close - open);
      count++;
    }

    return count > 0 ? totalBodySize / count : 0.01;
  }

  /**
   * Calculate recent volatility for context analysis
   */
  private calculateRecentVolatility(candles: OHLCVCandles[], index: number, period: number = 10): number {
    const start = Math.max(0, index - period);
    let totalRange = 0;
    let count = 0;

    for (let i = start; i < index; i++) {
      const high = this.safeParseFloat(candles[i].high);
      const low = this.safeParseFloat(candles[i].low);
      totalRange += (high - low);
      count++;
    }

    return count > 0 ? totalRange / count : 0.01;
  }

  /**
   * Find nearest support or resistance level
   */
  private findNearestSupportResistance(candles: OHLCVCandles[], index: number, lookingForSupport: boolean): number | null {
    const lookback = Math.min(this.config.supportResistanceWindow, index);
    const currentPrice = this.safeParseFloat(candles[index].close);
    
    let nearestLevel: number | null = null;
    let nearestDistance = Infinity;

    // Look for significant highs/lows in recent history
    for (let i = index - lookback; i < index - 1; i++) {
      if (i < 1) continue;
      
      const high = this.safeParseFloat(candles[i].high);
      const low = this.safeParseFloat(candles[i].low);
      
      // Check if this candle has a significant high or low
      const isSignificantHigh = this.isLocalHigh(candles, i, 2);
      const isSignificantLow = this.isLocalLow(candles, i, 2);
      
      const relevantPrice = lookingForSupport ? low : high;
      const isRelevantLevel = lookingForSupport ? isSignificantLow : isSignificantHigh;
      
      if (isRelevantLevel) {
        const distance = Math.abs(currentPrice - relevantPrice);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestLevel = relevantPrice;
        }
      }
    }

    return nearestLevel;
  }

  /**
   * Check if index represents a local high
   */
  private isLocalHigh(candles: OHLCVCandles[], index: number, window: number): boolean {
    const currentHigh = this.safeParseFloat(candles[index].high);
    
    for (let i = Math.max(0, index - window); i <= Math.min(candles.length - 1, index + window); i++) {
      if (i !== index) {
        const compareHigh = this.safeParseFloat(candles[i].high);
        if (compareHigh >= currentHigh) return false;
      }
    }
    
    return true;
  }

  /**
   * Check if index represents a local low
   */
  private isLocalLow(candles: OHLCVCandles[], index: number, window: number): boolean {
    const currentLow = this.safeParseFloat(candles[index].low);
    
    for (let i = Math.max(0, index - window); i <= Math.min(candles.length - 1, index + window); i++) {
      if (i !== index) {
        const compareLow = this.safeParseFloat(candles[i].low);
        if (compareLow <= currentLow) return false;
      }
    }
    
    return true;
  }

  /**
   * Create empty reversal candlestick result
   */
  private createEmptyReversalCandlestickResult(): ReversalCandlestickResult {
    return {
      isDetected: false,
      confidence: 0,
      patternType: 'doji_reversal',
      metadata: {
        bodySize: 0,
        upperWickSize: 0,
        lowerWickSize: 0,
        rejectionStrength: 0,
        trendContext: 'sideways',
        supportResistanceProximity: 100,
        volumeConfirmation: false,
        momentumExhaustion: 0,
        recentVolatility: 0,
        candleStrength: 0,
        contextValidation: false,
        patternCompleted: false,
        requiresConfirmation: true
      }
    };
  }

  /**
   * Create pattern signal for reversal candlestick patterns
   */
  private createReversalCandlestickSignal(
    result: ReversalCandlestickResult,
    strategyId: string,
    symbol: string,
    timeframe: TimeframeType,
    candles: OHLCVCandles[]
  ): InsertPatternSignal {
    const latestCandle = result.candle || {
      index: candles.length - 1,
      price: this.safeParseFloat(candles[candles.length - 1].close),
      timestamp: candles[candles.length - 1].timestamp,
      volume: candles[candles.length - 1].volume,
      isHigh: false
    };

    return {
      strategyId,
      symbol,
      timeframe,
      patternType: result.patternType,
      confidence: result.confidence.toString(),
      detectedAt: latestCandle.timestamp,
      priceLevel: latestCandle.price.toString(),
      metadata: {
        ...result.metadata,
        candle: {
          index: latestCandle.index,
          price: latestCandle.price,
          timestamp: latestCandle.timestamp.toISOString(),
          volume: latestCandle.volume
        },
        previousCandle: result.previousCandle ? {
          index: result.previousCandle.index,
          price: result.previousCandle.price,
          timestamp: result.previousCandle.timestamp.toISOString(),
          volume: result.previousCandle.volume
        } : undefined,
        confirmationCandle: result.confirmationCandle ? {
          index: result.confirmationCandle.index,
          price: result.confirmationCandle.price,
          timestamp: result.confirmationCandle.timestamp.toISOString(),
          volume: result.confirmationCandle.volume
        } : undefined,
        supportResistanceLevel: result.supportResistanceLevel,
        detectionMethod: 'reversal_candlestick_momentum_analysis',
        description: `${result.patternType} pattern with ${result.confidence.toFixed(1)}% confidence`
      },
      isActive: true
    };
  }
}
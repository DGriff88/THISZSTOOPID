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
}
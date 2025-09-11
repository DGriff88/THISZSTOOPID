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

export interface PatternDetectionConfig {
  minCandles: number;  // Minimum candles needed for detection
  lookbackPeriod: number;  // How far back to look for patterns
  minRejectionSize: number;  // Minimum rejection size as percentage
  volumeThreshold: number;  // Volume threshold for confirmation
  confidenceThreshold: number;  // Minimum confidence to trigger signal
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
}
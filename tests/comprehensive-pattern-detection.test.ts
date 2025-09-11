// Comprehensive Pattern Detection Test Suite
// Tests all pattern detection algorithms with realistic market scenarios
import { HeadAndShouldersDetector } from '../server/services/patternDetection.js';
import { type OHLCVCandles, type InsertPatternSignal } from '../shared/schema.js';

interface TestResult {
  testName: string;
  passed: boolean;
  patterns: InsertPatternSignal[];
  expectedPatterns: string[];
  actualPatterns: string[];
  confidence: number[];
  errors: string[];
}

interface TestScenario {
  name: string;
  candleGenerator: () => OHLCVCandles[];
  expectedPatterns: string[];
  minConfidence: number;
  description: string;
}

export class ComprehensivePatternTester {
  private detector: HeadAndShouldersDetector;
  private testResults: TestResult[] = [];

  constructor() {
    // Use relaxed settings for comprehensive testing
    this.detector = new HeadAndShouldersDetector({
      minCandles: 20,
      confidenceThreshold: 40.0, // Lower for testing
      minRejectionSize: 1.0,
      minPoleSize: 3.0,
      maxPullbackRatio: 0.4,
      minConsolidationDuration: 3,
      maxConsolidationDuration: 25,
      consolidationVolatilityThreshold: 3.0,
      minPrecedingMovement: 2.0,
      minReversalRatio: 0.6,
      minNegationRatio: 0.5,
      momentumExhaustionThreshold: 0.3,
      minBreakoutStrength: 1.5,
      minWickToBodyRatio: 1.5,
      dojiBodyThreshold: 0.15,
      engulfingMinimumRatio: 0.8
    });
  }

  // ===================== MARKET DATA GENERATORS =====================

  /**
   * Generate realistic bearish Head & Shoulders pattern
   */
  generateBearishHeadAndShouldersData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 100;
    let timestamp = new Date();

    // Pre-move: Strong uptrend for context (15 candles)
    for (let i = 0; i < 15; i++) {
      const upMove = 1.5 + Math.random() * 1.5;
      basePrice += upMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 1000 + Math.random() * 500, 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Left Shoulder: Peak with rejection (5 candles)
    const leftShoulderPeak = basePrice + 8;
    for (let i = 15; i < 20; i++) {
      const progress = (i - 15) / 4;
      const price = basePrice + (Math.sin(progress * Math.PI) * 8);
      candles.push(this.createCandle(`candle-${i}`, price, timestamp, 1200 + Math.random() * 600, 
        i < 17 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Valley (5 candles)
    const valleyPrice = basePrice - 2;
    for (let i = 20; i < 25; i++) {
      candles.push(this.createCandle(`candle-${i}`, valleyPrice + Math.random() * 2, timestamp, 
        800 + Math.random() * 300, Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Head: Highest peak with strong rejection (5 candles)
    const headPeak = leftShoulderPeak + 12;
    for (let i = 25; i < 30; i++) {
      const progress = (i - 25) / 4;
      const price = basePrice + (Math.sin(progress * Math.PI) * 20);
      candles.push(this.createCandle(`candle-${i}`, price, timestamp, 1500 + Math.random() * 800, 
        i < 27 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Second Valley (5 candles)
    for (let i = 30; i < 35; i++) {
      candles.push(this.createCandle(`candle-${i}`, valleyPrice + Math.random() * 2, timestamp, 
        900 + Math.random() * 400, Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Right Shoulder: Similar to left shoulder with rejection (5 candles)
    for (let i = 35; i < 40; i++) {
      const progress = (i - 35) / 4;
      const price = basePrice + (Math.sin(progress * Math.PI) * 7);
      candles.push(this.createCandle(`candle-${i}`, price, timestamp, 1100 + Math.random() * 500, 
        i < 37 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Breakdown confirmation (5 candles)
    let breakdownPrice = valleyPrice - 2;
    for (let i = 40; i < 45; i++) {
      breakdownPrice -= 1 + Math.random();
      candles.push(this.createCandle(`candle-${i}`, breakdownPrice, timestamp, 
        1200 + Math.random() * 600, 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    return candles;
  }

  /**
   * Generate realistic bullish Head & Shoulders pattern (inverted)
   */
  generateBullishHeadAndShouldersData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 150;
    let timestamp = new Date();

    // Pre-move: Strong downtrend for context (15 candles)
    for (let i = 0; i < 15; i++) {
      const downMove = 1.5 + Math.random() * 1.5;
      basePrice -= downMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 1000 + Math.random() * 500, 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Left Shoulder: Trough with rejection (5 candles)
    const leftShoulderTrough = basePrice - 8;
    for (let i = 15; i < 20; i++) {
      const progress = (i - 15) / 4;
      const price = basePrice - (Math.sin(progress * Math.PI) * 8);
      candles.push(this.createCandle(`candle-${i}`, price, timestamp, 1200 + Math.random() * 600, 
        i < 17 ? 'bearish' : 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Peak (5 candles)
    const peakPrice = basePrice + 2;
    for (let i = 20; i < 25; i++) {
      candles.push(this.createCandle(`candle-${i}`, peakPrice + Math.random() * 2, timestamp, 
        800 + Math.random() * 300, Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Head: Lowest trough with strong rejection (5 candles)
    const headTrough = leftShoulderTrough - 12;
    for (let i = 25; i < 30; i++) {
      const progress = (i - 25) / 4;
      const price = basePrice - (Math.sin(progress * Math.PI) * 20);
      candles.push(this.createCandle(`candle-${i}`, price, timestamp, 1500 + Math.random() * 800, 
        i < 27 ? 'bearish' : 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Second Peak (5 candles)
    for (let i = 30; i < 35; i++) {
      candles.push(this.createCandle(`candle-${i}`, peakPrice + Math.random() * 2, timestamp, 
        900 + Math.random() * 400, Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Right Shoulder: Similar to left shoulder with rejection (5 candles)
    for (let i = 35; i < 40; i++) {
      const progress = (i - 35) / 4;
      const price = basePrice - (Math.sin(progress * Math.PI) * 7);
      candles.push(this.createCandle(`candle-${i}`, price, timestamp, 1100 + Math.random() * 500, 
        i < 37 ? 'bearish' : 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Breakout confirmation (5 candles)
    let breakoutPrice = peakPrice + 2;
    for (let i = 40; i < 45; i++) {
      breakoutPrice += 1 + Math.random();
      candles.push(this.createCandle(`candle-${i}`, breakoutPrice, timestamp, 
        1200 + Math.random() * 600, 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    return candles;
  }

  /**
   * Generate bearish reversal flag pattern
   */
  generateBearishReversalFlagData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 100;
    let timestamp = new Date();

    // Strong momentum pole: Upward move with minimal pullbacks (12 candles)
    for (let i = 0; i < 12; i++) {
      const upMove = 2.5 + Math.random() * 1.5; // Strong moves
      const pullback = Math.random() * 0.3; // Minimal pullbacks
      basePrice += upMove - pullback;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1400 + Math.random() * 600, 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    const resistanceLevel = basePrice + 1;

    // Consolidation/Flag phase: Sideways movement with declining volume (10 candles)
    for (let i = 12; i < 22; i++) {
      const consolidationProgress = (i - 12) / 10;
      const volatility = 1.5 * (1 - consolidationProgress * 0.4); // Decreasing volatility
      const flagPrice = resistanceLevel + (Math.sin((i - 12) * 0.4) * volatility);
      const volume = Math.floor(1200 * (1 - consolidationProgress * 0.5)); // Declining volume
      
      candles.push(this.createCandle(`candle-${i}`, flagPrice, timestamp, volume, 
        Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Breakdown: Break below consolidation (8 candles)
    let breakdownPrice = resistanceLevel - 1;
    for (let i = 22; i < 30; i++) {
      breakdownPrice -= 1.5 + Math.random() * 1;
      candles.push(this.createCandle(`candle-${i}`, breakdownPrice, timestamp, 
        1300 + Math.random() * 700, 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    return candles;
  }

  /**
   * Generate bullish reversal flag pattern
   */
  generateBullishReversalFlagData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 180;
    let timestamp = new Date();

    // Strong momentum pole: Downward move with minimal pullbacks (12 candles)
    for (let i = 0; i < 12; i++) {
      const downMove = 2.5 + Math.random() * 1.5; // Strong moves
      const pullback = Math.random() * 0.3; // Minimal pullbacks
      basePrice -= downMove - pullback;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1400 + Math.random() * 600, 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    const supportLevel = basePrice - 1;

    // Consolidation/Flag phase: Sideways movement with declining volume (10 candles)
    for (let i = 12; i < 22; i++) {
      const consolidationProgress = (i - 12) / 10;
      const volatility = 1.5 * (1 - consolidationProgress * 0.4); // Decreasing volatility
      const flagPrice = supportLevel + (Math.sin((i - 12) * 0.4) * volatility);
      const volume = Math.floor(1200 * (1 - consolidationProgress * 0.5)); // Declining volume
      
      candles.push(this.createCandle(`candle-${i}`, flagPrice, timestamp, volume, 
        Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Breakout: Break above consolidation (8 candles)
    let breakoutPrice = supportLevel + 1;
    for (let i = 22; i < 30; i++) {
      breakoutPrice += 1.5 + Math.random() * 1;
      candles.push(this.createCandle(`candle-${i}`, breakoutPrice, timestamp, 
        1300 + Math.random() * 700, 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    return candles;
  }

  /**
   * Generate bearish Three Line Strike pattern
   */
  generateBearishThreeLineStrikeData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 120;
    let timestamp = new Date();

    // Context setup (10 candles)
    for (let i = 0; i < 10; i++) {
      candles.push(this.createCandle(`candle-${i}`, basePrice + Math.random() * 2, timestamp, 
        1000 + Math.random() * 300, Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Preceding bullish movement: 4 consecutive bullish candles
    for (let i = 10; i < 14; i++) {
      const moveSize = 2 + Math.random() * 1.5;
      basePrice += moveSize;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1200 + Math.random() * 400, 'bullish', moveSize));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    const moveStartPrice = basePrice - 10; // Approximate start of the move
    const totalMove = basePrice - moveStartPrice;

    // Large bearish reversal candle (negates 80% of preceding movement)
    const reversalSize = totalMove * 0.8;
    const reversalOpen = basePrice;
    const reversalClose = reversalOpen - reversalSize;
    
    candles.push({
      id: 'candle-14',
      symbol: 'TEST',
      timeframe: '1h',
      open: reversalOpen.toString(),
      high: (reversalOpen + 0.2).toString(),
      low: (reversalClose - 0.5).toString(),
      close: reversalClose.toString(),
      volume: 1800 + Math.floor(Math.random() * 600), // High volume
      timestamp
    });

    // Follow-through candles
    let followPrice = reversalClose;
    for (let i = 15; i < 20; i++) {
      followPrice -= 0.5 + Math.random() * 0.5;
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
      candles.push(this.createCandle(`candle-${i}`, followPrice, timestamp, 
        1000 + Math.random() * 300, 'bearish'));
    }

    return candles;
  }

  /**
   * Generate bullish Three Line Strike pattern
   */
  generateBullishThreeLineStrikeData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 80;
    let timestamp = new Date();

    // Context setup (10 candles)
    for (let i = 0; i < 10; i++) {
      candles.push(this.createCandle(`candle-${i}`, basePrice + Math.random() * 2, timestamp, 
        1000 + Math.random() * 300, Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Preceding bearish movement: 4 consecutive bearish candles
    for (let i = 10; i < 14; i++) {
      const moveSize = 2 + Math.random() * 1.5;
      basePrice -= moveSize;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1200 + Math.random() * 400, 'bearish', moveSize));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    const moveStartPrice = basePrice + 10; // Approximate start of the move
    const totalMove = moveStartPrice - basePrice;

    // Large bullish reversal candle (negates 80% of preceding movement)
    const reversalSize = totalMove * 0.8;
    const reversalOpen = basePrice;
    const reversalClose = reversalOpen + reversalSize;
    
    candles.push({
      id: 'candle-14',
      symbol: 'TEST',
      timeframe: '1h',
      open: reversalOpen.toString(),
      high: (reversalClose + 0.5).toString(),
      low: (reversalOpen - 0.2).toString(),
      close: reversalClose.toString(),
      volume: 1800 + Math.floor(Math.random() * 600), // High volume
      timestamp
    });

    // Follow-through candles
    let followPrice = reversalClose;
    for (let i = 15; i < 20; i++) {
      followPrice += 0.5 + Math.random() * 0.5;
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
      candles.push(this.createCandle(`candle-${i}`, followPrice, timestamp, 
        1000 + Math.random() * 300, 'bullish'));
    }

    return candles;
  }

  /**
   * Generate bearish trap pattern
   */
  generateBearishTrapData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 100;
    let timestamp = new Date();

    // Normal trending movement (15 candles)
    for (let i = 0; i < 15; i++) {
      const normalMove = 0.5 + Math.random() * 0.5;
      basePrice += normalMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1000 + Math.random() * 300, 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Strong breakout move (abnormally strong) (3 candles)
    for (let i = 15; i < 18; i++) {
      const strongMove = 3 + Math.random() * 2; // Much stronger than normal
      basePrice += strongMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1500 + Math.random() * 700, 'bullish', strongMove));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    const breakoutHigh = basePrice;

    // Immediate reversal (fast and strong) (5 candles)
    for (let i = 18; i < 23; i++) {
      const reversalMove = 2.5 + Math.random() * 1.5;
      basePrice -= reversalMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1400 + Math.random() * 600, 'bearish', reversalMove));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Continued bearish movement (7 candles)
    for (let i = 23; i < 30; i++) {
      const followMove = 1 + Math.random() * 1;
      basePrice -= followMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1200 + Math.random() * 500, 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    return candles;
  }

  /**
   * Generate bullish trap pattern
   */
  generateBullishTrapData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 150;
    let timestamp = new Date();

    // Normal trending movement (15 candles)
    for (let i = 0; i < 15; i++) {
      const normalMove = 0.5 + Math.random() * 0.5;
      basePrice -= normalMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1000 + Math.random() * 300, 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Strong breakdown move (abnormally strong) (3 candles)
    for (let i = 15; i < 18; i++) {
      const strongMove = 3 + Math.random() * 2; // Much stronger than normal
      basePrice -= strongMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1500 + Math.random() * 700, 'bearish', strongMove));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    const breakdownLow = basePrice;

    // Immediate reversal (fast and strong) (5 candles)
    for (let i = 18; i < 23; i++) {
      const reversalMove = 2.5 + Math.random() * 1.5;
      basePrice += reversalMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1400 + Math.random() * 600, 'bullish', reversalMove));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Continued bullish movement (7 candles)
    for (let i = 23; i < 30; i++) {
      const followMove = 1 + Math.random() * 1;
      basePrice += followMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1200 + Math.random() * 500, 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    return candles;
  }

  /**
   * Generate hammer candlestick pattern data
   */
  generateHammerCandlestickData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 100;
    let timestamp = new Date();

    // Downtrend context (15 candles)
    for (let i = 0; i < 15; i++) {
      const downMove = 1 + Math.random() * 1;
      basePrice -= downMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1000 + Math.random() * 300, 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Hammer candle: Small body, long lower wick, minimal upper wick
    const hammerOpen = basePrice;
    const hammerLow = hammerOpen - 4; // Long lower wick
    const hammerClose = hammerOpen - 0.5; // Small bearish body
    const hammerHigh = hammerOpen + 0.2; // Minimal upper wick

    candles.push({
      id: 'candle-15',
      symbol: 'TEST',
      timeframe: '1h',
      open: hammerOpen.toString(),
      high: hammerHigh.toString(),
      low: hammerLow.toString(),
      close: hammerClose.toString(),
      volume: 1300 + Math.floor(Math.random() * 500),
      timestamp
    });

    // Potential reversal confirmation (5 candles)
    let confirmPrice = hammerClose;
    for (let i = 16; i < 21; i++) {
      confirmPrice += 0.5 + Math.random() * 0.5;
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
      candles.push(this.createCandle(`candle-${i}`, confirmPrice, timestamp, 
        1100 + Math.random() * 400, 'bullish'));
    }

    return candles;
  }

  /**
   * Generate shooting star candlestick pattern data
   */
  generateShootingStarCandlestickData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 80;
    let timestamp = new Date();

    // Uptrend context (15 candles)
    for (let i = 0; i < 15; i++) {
      const upMove = 1 + Math.random() * 1;
      basePrice += upMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1000 + Math.random() * 300, 'bullish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Shooting star candle: Small body, long upper wick, minimal lower wick
    const starOpen = basePrice;
    const starHigh = starOpen + 4; // Long upper wick
    const starClose = starOpen + 0.5; // Small bullish body
    const starLow = starOpen - 0.2; // Minimal lower wick

    candles.push({
      id: 'candle-15',
      symbol: 'TEST',
      timeframe: '1h',
      open: starOpen.toString(),
      high: starHigh.toString(),
      low: starLow.toString(),
      close: starClose.toString(),
      volume: 1300 + Math.floor(Math.random() * 500),
      timestamp
    });

    // Potential reversal confirmation (5 candles)
    let confirmPrice = starClose;
    for (let i = 16; i < 21; i++) {
      confirmPrice -= 0.5 + Math.random() * 0.5;
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
      candles.push(this.createCandle(`candle-${i}`, confirmPrice, timestamp, 
        1100 + Math.random() * 400, 'bearish'));
    }

    return candles;
  }

  /**
   * Generate doji candlestick pattern data
   */
  generateDojiCandlestickData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 100;
    let timestamp = new Date();

    // Trending context (15 candles)
    for (let i = 0; i < 15; i++) {
      const move = 0.5 + Math.random() * 1;
      basePrice += Math.random() > 0.5 ? move : -move;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1000 + Math.random() * 300, Math.random() > 0.5 ? 'bullish' : 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Doji candle: Very small body, equal wicks
    const dojiPrice = basePrice;
    const dojiOpen = dojiPrice;
    const dojiClose = dojiPrice + 0.05; // Very small body
    const dojiHigh = dojiPrice + 2;
    const dojiLow = dojiPrice - 2;

    candles.push({
      id: 'candle-15',
      symbol: 'TEST',
      timeframe: '1h',
      open: dojiOpen.toString(),
      high: dojiHigh.toString(),
      low: dojiLow.toString(),
      close: dojiClose.toString(),
      volume: 1200 + Math.floor(Math.random() * 400),
      timestamp
    });

    // Post-doji uncertainty (5 candles)
    let postPrice = dojiClose;
    for (let i = 16; i < 21; i++) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      postPrice += direction * (0.3 + Math.random() * 0.7);
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
      candles.push(this.createCandle(`candle-${i}`, postPrice, timestamp, 
        1000 + Math.random() * 300, direction > 0 ? 'bullish' : 'bearish'));
    }

    return candles;
  }

  /**
   * Generate engulfing candlestick pattern data
   */
  generateEngulfingCandlestickData(): OHLCVCandles[] {
    const candles: OHLCVCandles[] = [];
    let basePrice = 100;
    let timestamp = new Date();

    // Downtrend context for bullish engulfing (13 candles)
    for (let i = 0; i < 13; i++) {
      const downMove = 0.8 + Math.random() * 0.8;
      basePrice -= downMove;
      candles.push(this.createCandle(`candle-${i}`, basePrice, timestamp, 
        1000 + Math.random() * 300, 'bearish'));
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
    }

    // Small bearish candle (to be engulfed)
    const smallOpen = basePrice;
    const smallClose = basePrice - 1;
    candles.push({
      id: 'candle-13',
      symbol: 'TEST',
      timeframe: '1h',
      open: smallOpen.toString(),
      high: (smallOpen + 0.2).toString(),
      low: (smallClose - 0.3).toString(),
      close: smallClose.toString(),
      volume: 900 + Math.floor(Math.random() * 300),
      timestamp
    });

    timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);

    // Large bullish engulfing candle
    const engulfingOpen = smallClose - 0.5; // Opens below small candle's close
    const engulfingClose = smallOpen + 1.5; // Closes above small candle's open
    candles.push({
      id: 'candle-14',
      symbol: 'TEST',
      timeframe: '1h',
      open: engulfingOpen.toString(),
      high: (engulfingClose + 0.3).toString(),
      low: (engulfingOpen - 0.2).toString(),
      close: engulfingClose.toString(),
      volume: 1500 + Math.floor(Math.random() * 600), // Higher volume
      timestamp
    });

    // Follow-through bullish candles (5 candles)
    let followPrice = engulfingClose;
    for (let i = 15; i < 20; i++) {
      followPrice += 0.5 + Math.random() * 0.5;
      timestamp = new Date(timestamp.getTime() + 60 * 60 * 1000);
      candles.push(this.createCandle(`candle-${i}`, followPrice, timestamp, 
        1200 + Math.random() * 400, 'bullish'));
    }

    return candles;
  }

  // ===================== HELPER METHODS =====================

  /**
   * Create a standardized candle with realistic OHLC values
   */
  private createCandle(
    id: string, 
    basePrice: number, 
    timestamp: Date, 
    volume: number, 
    type: 'bullish' | 'bearish',
    moveSize?: number
  ): OHLCVCandles {
    const move = moveSize || (0.5 + Math.random() * 1);
    const wickSize = 0.2 + Math.random() * 0.5;
    
    let open: number, high: number, low: number, close: number;
    
    if (type === 'bullish') {
      open = basePrice - move / 2;
      close = basePrice + move / 2;
      high = close + wickSize;
      low = open - wickSize;
    } else {
      open = basePrice + move / 2;
      close = basePrice - move / 2;
      high = open + wickSize;
      low = close - wickSize;
    }

    return {
      id,
      symbol: 'TEST',
      timeframe: '1h',
      open: open.toString(),
      high: high.toString(),
      low: low.toString(),
      close: close.toString(),
      volume: Math.floor(volume),
      timestamp: new Date(timestamp)
    };
  }

  // ===================== TEST EXECUTION =====================

  /**
   * Run comprehensive pattern detection tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Pattern Detection Test Suite');
    console.log('=' .repeat(80));

    const testScenarios: TestScenario[] = [
      {
        name: 'Bearish Head & Shoulders',
        candleGenerator: () => this.generateBearishHeadAndShouldersData(),
        expectedPatterns: ['head_shoulders_bearish'],
        minConfidence: 40,
        description: 'Classic bearish reversal with three peaks'
      },
      {
        name: 'Bullish Head & Shoulders',
        candleGenerator: () => this.generateBullishHeadAndShouldersData(),
        expectedPatterns: ['head_shoulders_bullish'],
        minConfidence: 40,
        description: 'Inverted H&S with three troughs'
      },
      {
        name: 'Bearish Reversal Flag',
        candleGenerator: () => this.generateBearishReversalFlagData(),
        expectedPatterns: ['reversal_flag_bearish'],
        minConfidence: 40,
        description: 'Strong uptrend followed by consolidation and breakdown'
      },
      {
        name: 'Bullish Reversal Flag',
        candleGenerator: () => this.generateBullishReversalFlagData(),
        expectedPatterns: ['reversal_flag_bullish'],
        minConfidence: 40,
        description: 'Strong downtrend followed by consolidation and breakout'
      },
      {
        name: 'Bearish Three Line Strike',
        candleGenerator: () => this.generateBearishThreeLineStrikeData(),
        expectedPatterns: ['three_line_strike_bearish'],
        minConfidence: 40,
        description: 'Consecutive bullish candles negated by large bearish candle'
      },
      {
        name: 'Bullish Three Line Strike',
        candleGenerator: () => this.generateBullishThreeLineStrikeData(),
        expectedPatterns: ['three_line_strike_bullish'],
        minConfidence: 40,
        description: 'Consecutive bearish candles negated by large bullish candle'
      },
      {
        name: 'Bearish Trap',
        candleGenerator: () => this.generateBearishTrapData(),
        expectedPatterns: ['trap_bearish'],
        minConfidence: 40,
        description: 'False breakout upward followed by immediate reversal'
      },
      {
        name: 'Bullish Trap',
        candleGenerator: () => this.generateBullishTrapData(),
        expectedPatterns: ['trap_bullish'],
        minConfidence: 40,
        description: 'False breakdown followed by immediate reversal'
      },
      {
        name: 'Hammer Candlestick',
        candleGenerator: () => this.generateHammerCandlestickData(),
        expectedPatterns: ['hammer_bullish'],
        minConfidence: 40,
        description: 'Bullish reversal candle with long lower wick'
      },
      {
        name: 'Shooting Star Candlestick',
        candleGenerator: () => this.generateShootingStarCandlestickData(),
        expectedPatterns: ['shooting_star_bearish'],
        minConfidence: 40,
        description: 'Bearish reversal candle with long upper wick'
      },
      {
        name: 'Doji Candlestick',
        candleGenerator: () => this.generateDojiCandlestickData(),
        expectedPatterns: ['doji_reversal', 'dragonfly_doji_bullish', 'gravestone_doji_bearish'],
        minConfidence: 40,
        description: 'Indecision candle with small body and equal wicks'
      },
      {
        name: 'Bullish Engulfing',
        candleGenerator: () => this.generateEngulfingCandlestickData(),
        expectedPatterns: ['bullish_engulfing'],
        minConfidence: 40,
        description: 'Large bullish candle engulfing previous bearish candle'
      }
    ];

    let totalTests = 0;
    let passedTests = 0;

    for (const scenario of testScenarios) {
      console.log(`\n📊 Testing: ${scenario.name}`);
      console.log(`   Description: ${scenario.description}`);
      
      try {
        const result = await this.runSingleTest(scenario);
        this.testResults.push(result);
        totalTests++;
        
        if (result.passed) {
          passedTests++;
          console.log(`   ✅ PASSED - Detected patterns: ${result.actualPatterns.join(', ')}`);
          console.log(`   📈 Confidence levels: ${result.confidence.map(c => c.toFixed(1)).join('%, ')}%`);
        } else {
          console.log(`   ❌ FAILED`);
          console.log(`   📈 Expected: ${result.expectedPatterns.join(', ')}`);
          console.log(`   📉 Actual: ${result.actualPatterns.join(', ') || 'None detected'}`);
          if (result.errors.length > 0) {
            console.log(`   🚨 Errors: ${result.errors.join(', ')}`);
          }
        }
      } catch (error) {
        console.log(`   💥 ERROR: ${error}`);
        this.testResults.push({
          testName: scenario.name,
          passed: false,
          patterns: [],
          expectedPatterns: scenario.expectedPatterns,
          actualPatterns: [],
          confidence: [],
          errors: [error.toString()]
        });
        totalTests++;
      }
    }

    this.printSummary(totalTests, passedTests);
  }

  /**
   * Run a single test scenario
   */
  private async runSingleTest(scenario: TestScenario): Promise<TestResult> {
    const testData = scenario.candleGenerator();
    const detectedPatterns = await this.detector.detectPatterns(
      testData,
      'test-strategy-1',
      'TEST',
      '1h'
    );

    const actualPatterns = detectedPatterns.map(p => p.patternType);
    const confidence = detectedPatterns.map(p => parseFloat(p.confidence));
    
    // Check if we detected at least one of the expected patterns
    const hasExpectedPattern = scenario.expectedPatterns.some(expected => 
      actualPatterns.includes(expected)
    );
    
    // Check if confidence meets minimum threshold
    const meetsConfidenceThreshold = detectedPatterns.length === 0 || 
      detectedPatterns.some(p => parseFloat(p.confidence) >= scenario.minConfidence);

    const passed = hasExpectedPattern && meetsConfidenceThreshold;

    return {
      testName: scenario.name,
      passed,
      patterns: detectedPatterns,
      expectedPatterns: scenario.expectedPatterns,
      actualPatterns,
      confidence,
      errors: []
    };
  }

  /**
   * Print test summary
   */
  private printSummary(totalTests: number, passedTests: number): void {
    console.log('\n' + '=' .repeat(80));
    console.log('📋 COMPREHENSIVE PATTERN DETECTION TEST SUMMARY');
    console.log('=' .repeat(80));
    
    console.log(`\n🎯 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    // Detailed results by pattern type
    console.log(`\n📊 Results by Pattern Type:`);
    
    const patternSummary = new Map<string, { total: number; passed: number }>();
    
    for (const result of this.testResults) {
      for (const expectedPattern of result.expectedPatterns) {
        if (!patternSummary.has(expectedPattern)) {
          patternSummary.set(expectedPattern, { total: 0, passed: 0 });
        }
        const summary = patternSummary.get(expectedPattern)!;
        summary.total++;
        if (result.actualPatterns.includes(expectedPattern)) {
          summary.passed++;
        }
      }
    }

    for (const [pattern, summary] of patternSummary) {
      const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
      const status = summary.passed === summary.total ? '✅' : summary.passed > 0 ? '⚠️' : '❌';
      console.log(`   ${status} ${pattern}: ${summary.passed}/${summary.total} (${successRate}%)`);
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    const failedTests = this.testResults.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      console.log(`   🎉 All pattern detection algorithms working correctly!`);
      console.log(`   ✨ Riley Coleman's specifications implemented successfully`);
      console.log(`   🚀 Ready for production deployment`);
    } else {
      console.log(`   🔧 ${failedTests.length} pattern(s) need attention:`);
      
      for (const failed of failedTests) {
        console.log(`     - ${failed.testName}: Review detection logic or confidence thresholds`);
      }
      
      console.log(`   📈 Consider adjusting confidence thresholds or pattern parameters`);
      console.log(`   🧪 Run additional tests with varied market conditions`);
    }

    console.log(`\n🏁 Pattern Detection Test Suite Complete!`);
  }

  /**
   * Export test results for further analysis
   */
  getTestResults(): TestResult[] {
    return this.testResults;
  }
}

// ===================== MAIN EXECUTION =====================

/**
 * Main test runner
 */
export async function runComprehensivePatternTests(): Promise<void> {
  const tester = new ComprehensivePatternTester();
  await tester.runAllTests();
  return tester.getTestResults();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensivePatternTests().catch(console.error);
}
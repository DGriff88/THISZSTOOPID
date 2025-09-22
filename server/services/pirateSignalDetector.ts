// TypeScript Pirate Pattern Signal Detector 🏴‍☠️

type Candlestick = {
  time: string; // ISO or HH:MM
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type SignalResult = {
  pattern: string;
  timeframe: string;
  confirmation: {
    volumeSpike: boolean;
    necklineBreakout: boolean;
    rsiConfirm: boolean;
  };
  buySignal: boolean;
};

export function detectPatterns(candles: Candlestick[]): SignalResult[] {
  const results: SignalResult[] = [];

  const doubleBottomPattern = (i: number) =>
    candles[i].low > candles[i - 1].low &&
    Math.abs(candles[i - 2].low - candles[i].low) / candles[i].low < 0.02 &&
    candles[i].close > candles[i - 1].close;

  for (let i = 2; i < candles.length; i++) {
    if (doubleBottomPattern(i)) {
      const confirmation = {
        volumeSpike: candles[i].volume > 1.2 * candles[i - 1].volume,
        necklineBreakout: candles[i].close > candles[i - 1].high,
        rsiConfirm: candles[i].close > candles[i - 2].close, // Simplified RSI logic
      };

      results.push({
        pattern: 'Double Bottom',
        timeframe: `${candles[i - 2].time} - ${candles[i].time}`,
        confirmation,
        buySignal: Object.values(confirmation).every(Boolean),
      });
    }

    // TODO: Add head & shoulders logic here.
  }

  return results;
}

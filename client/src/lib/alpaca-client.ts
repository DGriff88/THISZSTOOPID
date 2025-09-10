// Client-side utility functions for Alpaca integration
export interface AlpacaQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  timestamp: string;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  market_value: string;
  unrealized_pl: string;
}

export interface AlpacaAccount {
  equity: string;
  cash: string;
  day_trade_count: number;
  daytime_buying_power: string;
}

export class AlpacaClient {
  private baseUrl = '/api/alpaca';

  async getAccount(): Promise<AlpacaAccount> {
    const response = await fetch(`${this.baseUrl}/account`);
    if (!response.ok) {
      throw new Error('Failed to fetch account data');
    }
    return response.json();
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    const response = await fetch(`${this.baseUrl}/positions`);
    if (!response.ok) {
      throw new Error('Failed to fetch positions');
    }
    return response.json();
  }

  async createOrder(order: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    time_in_force: 'day' | 'gtc';
    limit_price?: number;
    stop_price?: number;
  }) {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    return response.json();
  }

  async getQuote(symbol: string): Promise<AlpacaQuote> {
    const response = await fetch(`/api/market/quote/${symbol}`);
    if (!response.ok) {
      throw new Error(`Failed to get quote for ${symbol}`);
    }
    return response.json();
  }
}

export const alpacaClient = new AlpacaClient();

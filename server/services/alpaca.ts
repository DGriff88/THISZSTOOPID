interface AlpacaConfig {
  apiKey: string;
  apiSecret: string;
  paper: boolean;
}

interface AlpacaPosition {
  symbol: string;
  qty: string;
  market_value: string;
  unrealized_pl: string;
}

interface AlpacaAccount {
  equity: string;
  cash: string;
  day_trade_count: number;
  daytime_buying_power: string;
}

interface AlpacaOrder {
  id: string;
  symbol: string;
  qty: string;
  side: 'buy' | 'sell';
  order_type: string;
  status: string;
  filled_avg_price?: string;
  filled_qty?: string;
}

interface AlpacaQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  timestamp: string;
}

export class AlpacaService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: AlpacaConfig) {
    this.baseUrl = config.paper 
      ? 'https://paper-api.alpaca.markets/v2'
      : 'https://api.alpaca.markets/v2';
    
    this.headers = {
      'APCA-API-KEY-ID': config.apiKey,
      'APCA-API-SECRET-KEY': config.apiSecret,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...this.headers,
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Alpaca API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getAccount(): Promise<AlpacaAccount> {
    return this.request<AlpacaAccount>('/account');
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    return this.request<AlpacaPosition[]>('/positions');
  }

  async createOrder(order: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    time_in_force: 'day' | 'gtc';
    limit_price?: number;
    stop_price?: number;
  }): Promise<AlpacaOrder> {
    return this.request<AlpacaOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getOrders(status?: string): Promise<AlpacaOrder[]> {
    const params = status ? `?status=${status}` : '';
    return this.request<AlpacaOrder[]>(`/orders${params}`);
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`/orders/${orderId}`, { method: 'DELETE' });
  }

  async getQuote(symbol: string): Promise<AlpacaQuote> {
    const dataUrl = 'https://data.alpaca.markets/v2';
    const response = await fetch(`${dataUrl}/stocks/${symbol}/quotes/latest`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get quote for ${symbol}`);
    }

    const data = await response.json();
    return {
      symbol,
      bid: data.quote.bp,
      ask: data.quote.ap,
      last: data.quote.ap, // Use ask price as last for simplicity
      timestamp: data.quote.t,
    };
  }

  async getBars(symbol: string, timeframe: string = '1Day', start?: string, end?: string): Promise<any[]> {
    const dataUrl = 'https://data.alpaca.markets/v2';
    let params = `?symbols=${symbol}&timeframe=${timeframe}`;
    
    if (start) params += `&start=${start}`;
    if (end) params += `&end=${end}`;

    const response = await fetch(`${dataUrl}/stocks/bars${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get bars for ${symbol}`);
    }

    const data = await response.json();
    return data.bars[symbol] || [];
  }

  async isMarketOpen(): Promise<boolean> {
    try {
      const clock = await this.request<{ is_open: boolean }>('/clock');
      return clock.is_open;
    } catch (error) {
      console.error('Error checking market status:', error);
      return false;
    }
  }

  async getMarketCalendar(): Promise<any[]> {
    return this.request<any[]>('/calendar');
  }
}

// Create singleton instance
let alpacaService: AlpacaService | null = null;

export function getAlpacaService(config?: AlpacaConfig): AlpacaService {
  if (!alpacaService && config) {
    alpacaService = new AlpacaService(config);
  }
  
  if (!alpacaService) {
    throw new Error('Alpaca service not initialized');
  }
  
  return alpacaService;
}

export function initializeAlpacaService(config: AlpacaConfig): void {
  alpacaService = new AlpacaService(config);
}

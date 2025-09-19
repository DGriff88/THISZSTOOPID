interface SchwabConfig {
  appKey: string;
  appSecret: string;
  refreshToken?: string;
  baseUrl?: string;
}

interface SchwabPosition {
  instrument: {
    symbol: string;
  };
  longQuantity: number;
  shortQuantity: number;
  marketValue: number;
  averagePrice: number;
  unrealizedPL: number;
}

interface SchwabAccount {
  securitiesAccount: {
    accountNumber: string;
    roundTrips: number;
    isDayTrader: boolean;
    isClosingOnlyRestricted: boolean;
    currentBalances: {
      liquidationValue: number;
      cashBalance: number;
      buyingPower: number;
    };
    positions?: SchwabPosition[];
  };
}

interface SchwabOrder {
  orderId: number;
  accountNumber: string;
  orderType: string;
  session: string;
  duration: string;
  orderStrategyType: string;
  status: string;
  filledQuantity?: number;
  price?: number;
  orderLegCollection: Array<{
    orderLegType: string;
    legId: number;
    instrument: {
      symbol: string;
      assetType: string;
    };
    instruction: string;
    positionEffect: string;
    quantity: number;
  }>;
}

interface SchwabQuote {
  [symbol: string]: {
    assetType: string;
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    mark: number;
    bidSize: number;
    askSize: number;
    totalVolume: number;
    quoteTime: number;
    tradeTime: number;
    highPrice: number;
    lowPrice: number;
    openPrice: number;
    closePrice: number;
    netChange: number;
    netPercentChange: number;
  };
}

interface SchwabPriceHistory {
  candles: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    datetime: number;
  }>;
  symbol: string;
  empty: boolean;
}

export class SchwabService {
  private baseUrl: string;
  private appKey: string;
  private appSecret: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: SchwabConfig) {
    this.baseUrl = config.baseUrl || 'https://api.schwabapi.com/v1';
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.refreshToken = config.refreshToken || null;
  }

  private async ensureAuthenticated(): Promise<void> {
    // Check if we have a valid access token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return;
    }

    // Try to refresh token if we have a refresh token
    if (this.refreshToken) {
      await this.refreshAccessToken();
      return;
    }

    throw new Error('No valid authentication token. Please complete OAuth flow.');
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const credentials = Buffer.from(`${this.appKey}:${this.appSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Schwab token refresh failed: ${response.status} - ${error}`);
    }

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    
    // Access tokens expire in 30 minutes
    this.tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000) - 60000); // 1 minute buffer
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Schwab API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // OAuth flow for initial authentication
  getAuthUrl(redirectUri?: string): string {
    const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const protocol = domain.includes('replit.dev') ? 'https://' : 'http://';
    const defaultRedirectUri = redirectUri || `${protocol}${domain}/auth/callback`;
    const callbackUrl = encodeURIComponent(defaultRedirectUri);
    return `${this.baseUrl}/oauth/authorize?client_id=${this.appKey}&redirect_uri=${callbackUrl}&response_type=code&scope=api`;
  }

  async exchangeCodeForTokens(authCode: string, redirectUri?: string): Promise<{ access_token: string; refresh_token: string }> {
    const credentials = Buffer.from(`${this.appKey}:${this.appSecret}`).toString('base64');
    
    const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const protocol = domain.includes('replit.dev') ? 'https://' : 'http://';
    const defaultRedirectUri = redirectUri || `${protocol}${domain}/auth/callback`;
    
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: defaultRedirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Schwab token exchange failed: ${response.status} - ${error}`);
    }

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000) - 60000);

    return tokens;
  }

  // Account Management
  async getAccount(accountNumber?: string): Promise<SchwabAccount> {
    if (accountNumber) {
      return this.request<SchwabAccount>(`/accounts/${accountNumber}?fields=positions`);
    } else {
      // Get all accounts and return the first one
      const accounts = await this.request<SchwabAccount[]>('/accounts?fields=positions');
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      return accounts[0];
    }
  }

  async getAccountNumbers(): Promise<Array<{ accountNumber: string; hashValue: string }>> {
    return this.request<Array<{ accountNumber: string; hashValue: string }>>('/accounts/accountNumbers');
  }

  async getPositions(accountNumber?: string): Promise<SchwabPosition[]> {
    const account = await this.getAccount(accountNumber);
    return account.securitiesAccount.positions || [];
  }

  // Order Management
  async createOrder(accountNumber: string, order: {
    symbol: string;
    quantity: number;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    timeInForce: 'DAY' | 'GTC';
    price?: number;
  }): Promise<{ orderId: number }> {
    const orderData = {
      orderType: order.type,
      session: 'NORMAL',
      duration: order.timeInForce,
      orderStrategyType: 'SINGLE',
      ...(order.type === 'LIMIT' && { price: order.price }),
      orderLegCollection: [
        {
          instruction: order.side,
          quantity: order.quantity,
          instrument: {
            symbol: order.symbol,
            assetType: 'EQUITY',
          },
        },
      ],
    };

    const response = await fetch(`${this.baseUrl}/accounts/${accountNumber}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Schwab order creation failed: ${response.status} - ${error}`);
    }

    // Extract order ID from Location header
    const location = response.headers.get('Location');
    const orderId = location ? parseInt(location.split('/').pop() || '0') : 0;
    
    return { orderId };
  }

  async getOrders(accountNumber: string, status?: string): Promise<SchwabOrder[]> {
    let endpoint = `/accounts/${accountNumber}/orders`;
    if (status) {
      endpoint += `?status=${status}`;
    }
    return this.request<SchwabOrder[]>(endpoint);
  }

  async cancelOrder(accountNumber: string, orderId: string): Promise<void> {
    await fetch(`${this.baseUrl}/accounts/${accountNumber}/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }

  // Market Data
  async getQuote(symbol: string): Promise<SchwabQuote> {
    return this.request<SchwabQuote>(`/marketdata/quotes?symbols=${symbol}`);
  }

  async getMultipleQuotes(symbols: string[]): Promise<SchwabQuote> {
    const symbolList = symbols.join(',');
    return this.request<SchwabQuote>(`/marketdata/quotes?symbols=${symbolList}`);
  }

  async getPriceHistory(
    symbol: string,
    periodType: 'day' | 'month' | 'year' = 'day',
    period: number = 1,
    frequencyType: 'minute' | 'daily' | 'weekly' | 'monthly' = 'daily',
    frequency: number = 1
  ): Promise<SchwabPriceHistory> {
    const params = new URLSearchParams({
      symbol,
      periodType,
      period: period.toString(),
      frequencyType,
      frequency: frequency.toString(),
    });

    return this.request<SchwabPriceHistory>(`/marketdata/pricehistory?${params}`);
  }

  // Market Status
  async isMarketOpen(): Promise<boolean> {
    try {
      const response = await this.request<{ equity: { isOpen: boolean } }>('/marketdata/markets');
      return response.equity.isOpen;
    } catch (error) {
      console.error('Error checking market status:', error);
      return false;
    }
  }

  // Utility methods for compatibility with existing app
  async getBars(symbol: string, timeframe: string = '1Day', start?: string, end?: string): Promise<any[]> {
    // Convert timeframe to Schwab format
    let periodType: 'day' | 'month' | 'year' = 'day';
    let frequencyType: 'minute' | 'daily' | 'weekly' | 'monthly' = 'daily';
    let frequency = 1;
    let period = 30; // Default to 30 days

    switch (timeframe) {
      case '1m':
        periodType = 'day';
        frequencyType = 'minute';
        frequency = 1;
        period = 1;
        break;
      case '5m':
        periodType = 'day';
        frequencyType = 'minute';
        frequency = 5;
        period = 1;
        break;
      case '15m':
        periodType = 'day';
        frequencyType = 'minute';
        frequency = 15;
        period = 1;
        break;
      case '30m':
        periodType = 'day';
        frequencyType = 'minute';
        frequency = 30;
        period = 1;
        break;
      case '1h':
        periodType = 'day';
        frequencyType = 'minute';
        frequency = 60;
        period = 5;
        break;
      case '1Day':
      case '1d':
        periodType = 'month';
        frequencyType = 'daily';
        frequency = 1;
        period = 6;
        break;
      case '1w':
        periodType = 'year';
        frequencyType = 'weekly';
        frequency = 1;
        period = 2;
        break;
    }

    const history = await this.getPriceHistory(symbol, periodType, period, frequencyType, frequency);
    
    // Convert to format expected by existing app
    return history.candles.map(candle => ({
      t: new Date(candle.datetime),
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
      v: candle.volume,
    }));
  }
}

// Create singleton instance
let schwabService: SchwabService | null = null;

export function getSchwabService(config?: SchwabConfig): SchwabService {
  if (!schwabService && config) {
    schwabService = new SchwabService(config);
  }
  
  if (!schwabService) {
    throw new Error('Schwab service not initialized');
  }
  
  return schwabService;
}

export function initializeSchwabService(config: SchwabConfig): void {
  schwabService = new SchwabService(config);
}
// BROKER SERVICE MODULE - Real Market Data API Access
// Based on the proven pattern from routes.ts

import { getAlpacaService } from './alpaca';
import { getSchwabService } from './schwab';

// Environment variables
const alpacaApiKey = process.env.ALPACA_API_KEY || process.env.VITE_ALPACA_API_KEY;
const alpacaApiSecret = process.env.ALPACA_API_SECRET || process.env.VITE_ALPACA_API_SECRET;
const schwabAppKey = process.env.SCHWAB_APP_KEY;
const schwabAppSecret = process.env.SCHWAB_APP_SECRET;
const schwabRefreshToken = process.env.SCHWAB_REFRESH_TOKEN;

/**
 * GET REAL BROKER SERVICE - Returns available broker service
 * 
 * Returns configured broker service for real market data access
 * Priority: Alpaca -> Schwab (since Schwab tokens expire frequently)
 */
export const getBrokerService = () => {
  console.log('🔍 Checking broker service availability...');
  
  // Try Alpaca first (more reliable for automation)
  if (alpacaApiKey && alpacaApiSecret) {
    try {
      const service = getAlpacaService();
      console.log('✅ Alpaca broker service available');
      return { type: 'alpaca' as const, service };
    } catch (error) {
      console.warn('⚠️ Alpaca service not available');
    }
  }
  
  // Fallback to Schwab (if credentials exist)
  if (schwabAppKey && schwabAppSecret && schwabRefreshToken) {
    try {
      const service = getSchwabService();
      console.log('✅ Schwab broker service available (may have token issues)');
      return { type: 'schwab' as const, service };
    } catch (error: any) {
      console.warn('⚠️ Schwab service not available:', error.message);
    }
  }
  
  console.warn('❌ No broker service configured - need API credentials');
  return null;
};

/**
 * VERIFY BROKER CONNECTION
 * 
 * Tests if broker service can make actual API calls
 */
export const verifyBrokerConnection = async () => {
  const broker = getBrokerService();
  if (!broker) {
    throw new Error('No broker service configured');
  }
  
  try {
    const { type, service } = broker;
    console.log(`🔗 Testing ${type.toUpperCase()} API connection...`);
    
    // Test with a simple quote request
    const quote = await service.getQuote('AAPL');
    console.log(`✅ ${type.toUpperCase()} API connection verified: AAPL = $${quote.last}`);
    
    return { type, connected: true, testPrice: quote.last };
  } catch (error: any) {
    console.error(`❌ Broker API connection failed: ${error.message}`);
    throw error;
  }
};
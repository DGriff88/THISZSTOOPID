import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Type definitions for API responses
interface MarketSentiment {
  symbol: string;
  currentPrice: number;
  dayChange: number;
  sentiment: string;
  confidence: number;
  insights?: string[];
  recommendation: string;
  riskLevel: string;
  timestamp: string;
  error?: string;
}

interface TradeRecommendation {
  symbol: string;
  action: string;
  positionSize?: number;
  entryPrice?: number;
  stopLoss?: number;
  targetPrice?: number;
  reasoning?: string;
  riskRating: string;
  timeframe: string;
  confidence: number;
  timestamp: string;
  error?: string;
}

interface MarketConditions {
  marketData?: Array<{
    symbol: string;
    price: number;
    change: string;
  }>;
  conditions?: {
    trend: string;
    volatility: string;
    sentiment: string;
    tradingStrategy: string;
    risks?: string[];
  };
  error?: string;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Brain, AlertTriangle } from "lucide-react";

export default function AIInsights() {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [analysisSymbols, setAnalysisSymbols] = useState(["AAPL", "GOOGL", "MSFT", "TSLA"]);

  // Market sentiment for selected symbol
  const { data: sentiment, isLoading: sentimentLoading } = useQuery<MarketSentiment>({
    queryKey: ['/api/ai/sentiment', selectedSymbol],
    enabled: !!selectedSymbol
  });

  // Trade recommendation for selected symbol
  const { data: recommendation, isLoading: recommendationLoading } = useQuery<TradeRecommendation>({
    queryKey: ['/api/ai/recommendation', selectedSymbol],
    enabled: !!selectedSymbol
  });

  // Overall market conditions
  const { data: marketConditions, isLoading: marketLoading } = useQuery<MarketConditions>({
    queryKey: ['/api/ai/market-conditions']
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish': return 'text-green-600 dark:text-green-400';
      case 'bearish': return 'text-red-600 dark:text-red-400';
      default: return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish': return <TrendingUp className="h-4 w-4" />;
      case 'bearish': return <TrendingDown className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action?.toLowerCase()) {
      case 'buy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'sell': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 bg-white dark:bg-black text-black dark:text-white">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-3xl font-bold">AI Trading Insights</h1>
      </div>

      {/* Symbol Selection */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">Symbol Analysis</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Get AI-powered sentiment and recommendations for any stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              data-testid="input-symbol"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., AAPL)"
              className="max-w-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white"
            />
            <Button 
              data-testid="button-analyze"
              onClick={() => {
                // Invalidate and refetch all AI queries for the current symbol
                queryClient.invalidateQueries({ queryKey: ['/api/ai/sentiment', selectedSymbol] });
                queryClient.invalidateQueries({ queryKey: ['/api/ai/recommendation', selectedSymbol] });
                queryClient.invalidateQueries({ queryKey: ['/api/ai/market-conditions'] });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Sentiment */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-black dark:text-white flex items-center gap-2">
              Market Sentiment
              {sentiment && getSentimentIcon(sentiment.sentiment)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentLoading ? (
              <div data-testid="sentiment-loading" className="text-gray-500 dark:text-gray-400">Loading sentiment analysis...</div>
            ) : sentiment?.error ? (
              <div data-testid="sentiment-error" className="text-red-600 dark:text-red-400">{sentiment.error}</div>
            ) : sentiment ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
                  <span data-testid="text-symbol" className="font-bold text-black dark:text-white">{sentiment.symbol}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Price:</span>
                  <span data-testid="text-price" className="font-bold text-black dark:text-white">${sentiment.currentPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Day Change:</span>
                  <span data-testid="text-change" className={`font-bold ${sentiment.dayChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {sentiment.dayChange >= 0 ? '+' : ''}{sentiment.dayChange}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Sentiment:</span>
                  <Badge data-testid="badge-sentiment" className={getSentimentColor(sentiment.sentiment)}>
                    {sentiment.sentiment}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                  <span data-testid="text-confidence" className="font-bold text-black dark:text-white">
                    {(sentiment.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                {sentiment.insights && sentiment.insights.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-black dark:text-white">Key Insights:</h4>
                    <ul className="space-y-1">
                      {sentiment.insights.map((insight: string, index: number) => (
                        <li key={index} data-testid={`insight-${index}`} className="text-sm text-gray-600 dark:text-gray-400">
                          • {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Trade Recommendation */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">AI Trade Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            {recommendationLoading ? (
              <div data-testid="recommendation-loading" className="text-gray-500 dark:text-gray-400">Loading recommendation...</div>
            ) : recommendation?.error ? (
              <div data-testid="recommendation-error" className="text-red-600 dark:text-red-400">{recommendation.error}</div>
            ) : recommendation ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Action:</span>
                  <Badge data-testid="badge-action" className={getActionColor(recommendation.action)}>
                    {recommendation.action?.toUpperCase()}
                  </Badge>
                </div>
                {recommendation.positionSize > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Position Size:</span>
                    <span data-testid="text-position-size" className="font-bold text-black dark:text-white">
                      ${recommendation.positionSize?.toLocaleString()}
                    </span>
                  </div>
                )}
                {recommendation.entryPrice && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Entry Price:</span>
                    <span data-testid="text-entry-price" className="font-bold text-black dark:text-white">
                      ${recommendation.entryPrice}
                    </span>
                  </div>
                )}
                {recommendation.stopLoss && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Stop Loss:</span>
                    <span data-testid="text-stop-loss" className="font-bold text-red-600 dark:text-red-400">
                      ${recommendation.stopLoss}
                    </span>
                  </div>
                )}
                {recommendation.targetPrice && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Target Price:</span>
                    <span data-testid="text-target-price" className="font-bold text-green-600 dark:text-green-400">
                      ${recommendation.targetPrice}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Risk Rating:</span>
                  <Badge data-testid="badge-risk" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                    {recommendation.riskRating}
                  </Badge>
                </div>
                {recommendation.reasoning && (
                  <div>
                    <h4 className="font-semibold mb-2 text-black dark:text-white">AI Reasoning:</h4>
                    <p data-testid="text-reasoning" className="text-sm text-gray-600 dark:text-gray-400">
                      {recommendation.reasoning}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Market Conditions */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">Overall Market Conditions</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            AI analysis of current market environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {marketLoading ? (
            <div data-testid="market-loading" className="text-gray-500 dark:text-gray-400">Loading market analysis...</div>
          ) : marketConditions?.error ? (
            <div data-testid="market-error" className="text-red-600 dark:text-red-400">{marketConditions.error}</div>
          ) : marketConditions ? (
            <div className="space-y-6">
              {/* Market Data */}
              <div>
                <h4 className="font-semibold mb-3 text-black dark:text-white">Key Market Indicators</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {marketConditions.marketData?.map((data: any, index: number) => (
                    <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div data-testid={`market-symbol-${index}`} className="font-bold text-black dark:text-white">{data.symbol}</div>
                      <div data-testid={`market-price-${index}`} className="text-sm text-gray-600 dark:text-gray-400">${data.price}</div>
                      <div data-testid={`market-change-${index}`} className={`text-sm font-medium ${parseFloat(data.change) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {parseFloat(data.change) >= 0 ? '+' : ''}{data.change}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Conditions */}
              <div>
                <h4 className="font-semibold mb-3 text-black dark:text-white">Market Assessment</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-gray-600 dark:text-gray-400">Trend</div>
                    <Badge data-testid="badge-trend" className="mt-1">{marketConditions.conditions?.trend || 'N/A'}</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600 dark:text-gray-400">Volatility</div>
                    <Badge data-testid="badge-volatility" className="mt-1">{marketConditions.conditions?.volatility || 'N/A'}</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600 dark:text-gray-400">Sentiment</div>
                    <Badge data-testid="badge-market-sentiment" className="mt-1">{marketConditions.conditions?.sentiment || 'N/A'}</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600 dark:text-gray-400">Strategy</div>
                    <Badge data-testid="badge-strategy" className="mt-1">{marketConditions.conditions?.tradingStrategy || 'N/A'}</Badge>
                  </div>
                </div>
              </div>

              {/* Risks */}
              {marketConditions.conditions?.risks && marketConditions.conditions.risks.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-black dark:text-white">Key Risks</h4>
                  <ul className="space-y-1">
                    {marketConditions.conditions.risks.map((risk: string, index: number) => (
                      <li key={index} data-testid={`risk-${index}`} className="text-sm text-gray-600 dark:text-gray-400">
                        ⚠️ {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
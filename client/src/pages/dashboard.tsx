import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StrategyModal from "@/components/modals/strategy-modal";
import PerformanceChart from "@/components/charts/performance-chart";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";
import { 
  Wallet, 
  Settings, 
  TrendingUp, 
  Target, 
  Plus, 
  Play, 
  Pause, 
  Edit,
  Download,
  Shield,
  History
} from "lucide-react";
import { type PortfolioSummary, type StrategyPerformance, type Trade } from "@shared/schema";

export default function Dashboard() {
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [realtimeData, setRealtimeData] = useState<any>(null);

  const { data: portfolioSummary, isLoading: portfolioLoading } = useQuery<PortfolioSummary>({
    queryKey: ['/api/portfolio/summary'],
    refetchInterval: 30000,
  });

  const { data: strategies, isLoading: strategiesLoading } = useQuery<StrategyPerformance[]>({
    queryKey: ['/api/strategies/performance'],
    refetchInterval: 30000,
  });

  const { data: recentTrades, isLoading: tradesLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
    refetchInterval: 30000,
  });

  const { data: portfolioHistory } = useQuery({
    queryKey: ['/api/portfolio/history', { days: 30 }],
    refetchInterval: 60000,
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'portfolio_update':
          setRealtimeData(message.data);
          break;
        case 'market_data':
          // Handle market data updates
          break;
        default:
          break;
      }
    },
  });

  // Use real-time data if available, fallback to API data
  const currentPortfolio = realtimeData?.portfolio || portfolioSummary;
  const currentStrategies = realtimeData?.strategies || strategies || [];
  const currentTrades = realtimeData?.recentTrades || recentTrades || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Generate chart data from portfolio history
  const chartData = (portfolioHistory as any)?.map((snapshot: any) => ({
    date: snapshot.timestamp,
    value: parseFloat(snapshot.totalValue),
  })) || [];

  if (portfolioLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Trading Dashboard" 
        description="Monitor your automated trading strategies" 
      />
      
      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Portfolio</p>
                  <p className="text-2xl font-bold" data-testid="portfolio-total-value">
                    {currentPortfolio ? formatCurrency(currentPortfolio.totalValue) : '--'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm ${currentPortfolio?.dayPnL >= 0 ? 'profit-text' : 'loss-text'}`}>
                  {currentPortfolio ? formatCurrency(currentPortfolio.dayPnL) : '--'}
                </span>
                <span className="text-xs text-muted-foreground ml-2">Today</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Strategies</p>
                  <p className="text-2xl font-bold" data-testid="active-strategies-count">
                    {currentPortfolio?.activeStrategies || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-muted-foreground">
                  {currentStrategies.filter((s: any) => s.isPaperTrading).length} Paper / {currentStrategies.filter((s: any) => !s.isPaperTrading).length} Live
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's P&L</p>
                  <p className={`text-2xl font-bold ${currentPortfolio?.dayPnL >= 0 ? 'profit-text' : 'loss-text'}`} data-testid="today-pnl">
                    {currentPortfolio ? formatCurrency(currentPortfolio.dayPnL) : '--'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-muted-foreground">
                  {currentTrades.length} trades executed
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold" data-testid="win-rate">
                    {currentPortfolio?.winRate?.toFixed(1) || '0.0'}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/20 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-warning" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-muted-foreground">Last 30 days</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Strategies */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Trading Strategies</CardTitle>
                  <Button 
                    onClick={() => setIsStrategyModalOpen(true)}
                    data-testid="button-create-strategy"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Strategy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {strategiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : currentStrategies.length > 0 ? (
                  <div className="space-y-4">
                    {currentStrategies.slice(0, 5).map((strategy: any) => (
                      <div 
                        key={strategy.strategyId} 
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                        data-testid={`strategy-${strategy.strategyId}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${strategy.isActive ? 'status-active' : 'status-inactive'}`}></div>
                          <div>
                            <h4 className="font-medium">{strategy.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {strategy.totalTrades} trades • {strategy.winRate.toFixed(1)}% win rate
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${strategy.totalPnL >= 0 ? 'profit-text' : 'loss-text'}`}>
                            {formatCurrency(strategy.totalPnL)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {strategy.isPaperTrading ? 'Paper Trading' : 'Live Trading'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            {strategy.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active strategies</p>
                    <p className="text-sm">Create your first strategy to start trading</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {tradesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : currentTrades.length > 0 ? (
                <div className="space-y-4">
                  {currentTrades.slice(0, 8).map((trade: any) => (
                    <div key={trade.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(trade.executedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {trade.side.toUpperCase()} {trade.quantity}
                        </p>
                        <p className={`text-sm ${trade.pnl && parseFloat(trade.pnl) >= 0 ? 'profit-text' : 'loss-text'}`}>
                          {trade.pnl ? formatCurrency(parseFloat(trade.pnl)) : '--'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent trades</p>
                  <p className="text-sm">Trades will appear here when strategies execute</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart data={chartData} height={250} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Drawdown</span>
                  <span className="text-sm font-mono">-2.34%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sharpe Ratio</span>
                  <span className="text-sm font-mono">1.42</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">VaR (95%)</span>
                  <span className="text-sm font-mono">$1,234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Exposure</span>
                  <span className="text-sm font-mono">
                    {currentPortfolio ? formatCurrency(currentPortfolio.totalValue * 0.8) : '--'}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-4">Position Allocation</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Stocks</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-muted rounded-full">
                        <div className="w-16 h-full bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm font-mono">80%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cash</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-muted rounded-full">
                        <div className="w-4 h-full bg-secondary rounded-full"></div>
                      </div>
                      <span className="text-sm font-mono">20%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                className="flex items-center space-x-3 h-16"
                onClick={() => setIsStrategyModalOpen(true)}
                data-testid="button-quick-create-strategy"
              >
                <Plus className="w-5 h-5" />
                <span>Create Strategy</span>
              </Button>
              <Button variant="secondary" className="flex items-center space-x-3 h-16">
                <History className="w-5 h-5" />
                <span>Run Backtest</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-3 h-16">
                <Download className="w-5 h-5" />
                <span>Export Data</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-3 h-16">
                <Shield className="w-5 h-5" />
                <span>Risk Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <StrategyModal 
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
      />
    </div>
  );
}

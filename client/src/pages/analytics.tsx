import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PerformanceChart from "@/components/charts/performance-chart";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  PieChart,
  Calendar,
  Download
} from "lucide-react";
import { type StrategyPerformance, type Trade } from "@shared/schema";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30");
  const [analysisType, setAnalysisType] = useState("all"); // all, live, paper

  // Fetch strategy performance data
  const { data: strategyPerformance, isLoading: performanceLoading } = useQuery<StrategyPerformance[]>({
    queryKey: ['/api/strategies/performance'],
    refetchInterval: 60000,
  });

  // Fetch trade history for analysis
  const { data: allTrades } = useQuery<Trade[]>({
    queryKey: ['/api/trades', { limit: 1000 }],
    refetchInterval: 60000,
  });

  // Fetch portfolio history
  const { data: portfolioHistory } = useQuery({
    queryKey: ['/api/portfolio/history', { days: parseInt(timeRange) }],
    refetchInterval: 60000,
  });

  // Filter trades based on analysis type and time range
  const filteredTrades = allTrades?.filter(trade => {
    if (analysisType === "live" && trade.isPaperTrade) return false;
    if (analysisType === "paper" && !trade.isPaperTrade) return false;
    
    const tradeDate = new Date(trade.executedAt);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
    
    return tradeDate >= cutoffDate;
  }) || [];

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Calculate analytics metrics
  const totalTrades = filteredTrades.length;
  const winningTrades = filteredTrades.filter(t => t.pnl && parseFloat(t.pnl) > 0).length;
  const losingTrades = filteredTrades.filter(t => t.pnl && parseFloat(t.pnl) < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  const totalPnL = filteredTrades.reduce((sum, trade) => 
    sum + (trade.pnl ? parseFloat(trade.pnl) : 0), 0
  );
  
  const avgWin = winningTrades > 0 ? 
    filteredTrades
      .filter(t => t.pnl && parseFloat(t.pnl) > 0)
      .reduce((sum, t) => sum + parseFloat(t.pnl!), 0) / winningTrades : 0;
      
  const avgLoss = losingTrades > 0 ? 
    filteredTrades
      .filter(t => t.pnl && parseFloat(t.pnl) < 0)
      .reduce((sum, t) => sum + parseFloat(t.pnl!), 0) / losingTrades : 0;

  const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;

  // Symbol performance analysis
  const symbolPerformance = filteredTrades.reduce((acc, trade) => {
    if (!acc[trade.symbol]) {
      acc[trade.symbol] = {
        symbol: trade.symbol,
        trades: 0,
        totalPnL: 0,
        wins: 0,
        losses: 0,
      };
    }
    
    acc[trade.symbol].trades += 1;
    if (trade.pnl) {
      const pnl = parseFloat(trade.pnl);
      acc[trade.symbol].totalPnL += pnl;
      if (pnl > 0) acc[trade.symbol].wins += 1;
      if (pnl < 0) acc[trade.symbol].losses += 1;
    }
    
    return acc;
  }, {} as Record<string, any>);

  const sortedSymbols = Object.values(symbolPerformance)
    .sort((a: any, b: any) => b.totalPnL - a.totalPnL)
    .slice(0, 10);

  // Generate performance chart data
  const chartData = (portfolioHistory as any)?.map((snapshot: any) => ({
    date: snapshot.timestamp,
    value: parseFloat(snapshot.totalValue),
  })) || [];

  const handleExportAnalytics = () => {
    const analyticsData = {
      timeRange: `${timeRange} days`,
      analysisType,
      summary: {
        totalTrades,
        winRate: winRate.toFixed(2) + '%',
        totalPnL: formatCurrency(totalPnL),
        avgWin: formatCurrency(avgWin),
        avgLoss: formatCurrency(avgLoss),
        profitFactor: profitFactor.toFixed(2),
      },
      symbolPerformance: sortedSymbols,
      strategyPerformance,
    };
    
    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (performanceLoading) {
    return (
      <div>
        <Header title="Analytics" description="Analyze your trading performance and strategies" />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Analytics" description="Analyze your trading performance and strategies" />
      
      <div className="p-6 space-y-6">
        {/* Analytics Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Performance Analytics
              </CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-32" data-testid="select-time-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Select value={analysisType} onValueChange={setAnalysisType}>
                  <SelectTrigger className="w-32" data-testid="select-analysis-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trades</SelectItem>
                    <SelectItem value="live">Live Only</SelectItem>
                    <SelectItem value="paper">Paper Only</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={handleExportAnalytics} data-testid="button-export-analytics">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total P&L</p>
                  <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'profit-text' : 'loss-text'}`} data-testid="analytics-total-pnl">
                    {formatCurrency(totalPnL)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {totalTrades} trades analyzed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold" data-testid="analytics-win-rate">
                    {winRate.toFixed(1)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-primary" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {winningTrades}W / {losingTrades}L
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Profit Factor</p>
                  <p className="text-2xl font-bold" data-testid="analytics-profit-factor">
                    {profitFactor.toFixed(2)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-warning" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Avg Win / Avg Loss
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Win</p>
                  <p className="text-2xl font-bold profit-text" data-testid="analytics-avg-win">
                    {formatCurrency(avgWin)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Avg Loss: {formatCurrency(avgLoss)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList data-testid="analytics-tabs">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="strategies">Strategy Analysis</TabsTrigger>
            <TabsTrigger value="symbols">Symbol Analysis</TabsTrigger>
            <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Performance Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Portfolio Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceChart data={chartData} height={300} />
                </CardContent>
              </Card>

              {/* Performance Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Winning Trades</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-muted rounded-full">
                          <div 
                            className="h-full bg-success rounded-full" 
                            style={{ width: `${winRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-mono">{winningTrades}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Losing Trades</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-muted rounded-full">
                          <div 
                            className="h-full bg-destructive rounded-full" 
                            style={{ width: `${totalTrades > 0 ? (losingTrades / totalTrades) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-mono">{losingTrades}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Volume</span>
                      <span className="font-mono">
                        {filteredTrades.reduce((sum, t) => sum + t.quantity, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Trade Size</span>
                      <span className="font-mono">
                        {totalTrades > 0 ? 
                          Math.round(filteredTrades.reduce((sum, t) => sum + t.quantity, 0) / totalTrades) : 0
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Most Traded</span>
                      <span className="font-mono">
                        {sortedSymbols[0]?.symbol || 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {strategyPerformance && strategyPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {strategyPerformance.map((strategy) => (
                      <div 
                        key={strategy.strategyId} 
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                        data-testid={`strategy-analytics-${strategy.strategyId}`}
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
                          <div className="flex items-center space-x-2">
                            <Badge variant={strategy.isPaperTrading ? "secondary" : "default"} className="text-xs">
                              {strategy.isPaperTrading ? "Paper" : "Live"}
                            </Badge>
                            <Badge variant={strategy.isActive ? "default" : "outline"} className="text-xs">
                              {strategy.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No strategy performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="symbols" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Symbol Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {sortedSymbols.length > 0 ? (
                  <div className="space-y-4">
                    {sortedSymbols.map((symbol: any) => (
                      <div 
                        key={symbol.symbol} 
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                        data-testid={`symbol-analytics-${symbol.symbol}`}
                      >
                        <div>
                          <h4 className="font-medium">{symbol.symbol}</h4>
                          <p className="text-sm text-muted-foreground">
                            {symbol.trades} trades • {symbol.wins}W/{symbol.losses}L
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${symbol.totalPnL >= 0 ? 'profit-text' : 'loss-text'}`}>
                            {formatCurrency(symbol.totalPnL)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {((symbol.wins / symbol.trades) * 100).toFixed(1)}% win rate
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No symbol data available for the selected period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Profit Factor</span>
                      <span className="font-mono">{profitFactor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Max Consecutive Wins</span>
                      <span className="font-mono">
                        {/* Calculate max consecutive wins */}
                        {(() => {
                          let maxWins = 0;
                          let currentWins = 0;
                          filteredTrades.forEach(trade => {
                            if (trade.pnl && parseFloat(trade.pnl) > 0) {
                              currentWins++;
                              maxWins = Math.max(maxWins, currentWins);
                            } else {
                              currentWins = 0;
                            }
                          });
                          return maxWins;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Max Consecutive Losses</span>
                      <span className="font-mono">
                        {/* Calculate max consecutive losses */}
                        {(() => {
                          let maxLosses = 0;
                          let currentLosses = 0;
                          filteredTrades.forEach(trade => {
                            if (trade.pnl && parseFloat(trade.pnl) < 0) {
                              currentLosses++;
                              maxLosses = Math.max(maxLosses, currentLosses);
                            } else {
                              currentLosses = 0;
                            }
                          });
                          return maxLosses;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Largest Win</span>
                      <span className="font-mono profit-text">
                        {filteredTrades.length > 0 ? 
                          formatCurrency(Math.max(...filteredTrades.map(t => 
                            t.pnl ? parseFloat(t.pnl) : 0
                          ))) : '--'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Largest Loss</span>
                      <span className="font-mono loss-text">
                        {filteredTrades.length > 0 ? 
                          formatCurrency(Math.min(...filteredTrades.map(t => 
                            t.pnl ? parseFloat(t.pnl) : 0
                          ))) : '--'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trading Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Trades</span>
                      <span className="font-mono">{totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Trades/Day</span>
                      <span className="font-mono">
                        {(totalTrades / parseInt(timeRange)).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Live Trades</span>
                      <span className="font-mono">
                        {filteredTrades.filter(t => !t.isPaperTrade).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Paper Trades</span>
                      <span className="font-mono">
                        {filteredTrades.filter(t => t.isPaperTrade).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

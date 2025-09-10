import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Play, 
  Pause, 
  Plus,
  BookOpen,
  TestTube
} from "lucide-react";
import { type Strategy, type Trade } from "@shared/schema";

export default function PaperTrading() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [orderForm, setOrderForm] = useState({
    symbol: "",
    side: "buy" as "buy" | "sell",
    quantity: "",
    orderType: "market" as "market" | "limit",
    limitPrice: "",
  });

  // Fetch paper trading strategies
  const { data: paperStrategies, isLoading: strategiesLoading } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies'],
    select: (data) => data?.filter(strategy => strategy.isPaperTrading) || [],
    refetchInterval: 10000,
  });

  // Fetch paper trades
  const { data: paperTrades } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
    select: (data) => data?.filter(trade => trade.isPaperTrade).slice(0, 15) || [],
    refetchInterval: 10000,
  });

  // Fetch portfolio summary for paper trading
  const { data: portfolioSummary } = useQuery({
    queryKey: ['/api/portfolio/summary'],
    refetchInterval: 30000,
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'portfolio_update' || message.type === 'trade_update') {
        setRealtimeData(message.data);
        queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
        queryClient.invalidateQueries({ queryKey: ['/api/portfolio/summary'] });
      }
    },
  });

  const createPaperTradeMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // Simulate paper trade execution
      const response = await apiRequest('POST', '/api/trades', {
        ...orderData,
        executedAt: new Date().toISOString(),
        isPaperTrade: true,
        status: 'filled',
        price: (Math.random() * 50 + 100).toFixed(2), // Simulate price
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/summary'] });
      toast({
        title: "Success",
        description: "Paper trade executed successfully",
      });
      setIsOrderModalOpen(false);
      setOrderForm({
        symbol: "",
        side: "buy",
        quantity: "",
        orderType: "market",
        limitPrice: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to execute paper trade",
        variant: "destructive",
      });
    },
  });

  const toggleStrategyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest('PUT', `/api/strategies/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      toast({
        title: "Success",
        description: "Strategy status updated",
      });
    },
  });

  const handleSubmitPaperTrade = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderForm.symbol || !orderForm.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const tradeData = {
      symbol: orderForm.symbol.toUpperCase(),
      side: orderForm.side,
      quantity: parseInt(orderForm.quantity),
      strategyId: null, // Manual paper trade
    };

    createPaperTradeMutation.mutate(tradeData);
  };

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Calculate paper trading stats
  const paperPnL = paperTrades?.reduce((sum, trade) => {
    return sum + (trade.pnl ? parseFloat(trade.pnl) : 0);
  }, 0) || 0;

  const paperWinningTrades = paperTrades?.filter(trade => 
    trade.pnl && parseFloat(trade.pnl) > 0
  ).length || 0;

  const paperWinRate = paperTrades?.length ? 
    (paperWinningTrades / paperTrades.length) * 100 : 0;

  if (strategiesLoading) {
    return (
      <div>
        <Header title="Paper Trading" description="Practice trading with simulated funds" />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading paper trading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Paper Trading" description="Practice trading with simulated funds" />
      
      <div className="p-6 space-y-6">
        {/* Paper Trading Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paper Portfolio</p>
                  <p className="text-2xl font-bold" data-testid="paper-portfolio-value">
                    {portfolioSummary ? formatCurrency((portfolioSummary as any).totalValue) : '$100,000.00'}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-xs text-muted-foreground">Simulated funds</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paper P&L</p>
                  <p className={`text-2xl font-bold ${paperPnL >= 0 ? 'profit-text' : 'loss-text'}`} data-testid="paper-pnl">
                    {formatCurrency(paperPnL)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-xs text-muted-foreground">Total realized</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paper Trades</p>
                  <p className="text-2xl font-bold" data-testid="paper-trades-count">
                    {paperTrades?.length || 0}
                  </p>
                </div>
                <TestTube className="w-8 h-8 text-warning" />
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-xs text-muted-foreground">Total executed</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold" data-testid="paper-win-rate">
                    {paperWinRate.toFixed(1)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-success" />
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-xs text-muted-foreground">Paper trading</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Paper Trading Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Manual Paper Trading */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Manual Paper Trades
                <Button 
                  size="sm"
                  onClick={() => setIsOrderModalOpen(true)}
                  data-testid="button-manual-paper-trade"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Practice Trade
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Practice trading</p>
                <p className="text-sm">Execute manual trades with simulated funds</p>
              </div>
            </CardContent>
          </Card>

          {/* Paper Trading Strategies */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Paper Trading Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                {paperStrategies && paperStrategies.length > 0 ? (
                  <div className="space-y-4">
                    {paperStrategies.map((strategy) => (
                      <div 
                        key={strategy.id} 
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                        data-testid={`paper-strategy-${strategy.id}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${strategy.isActive ? 'status-active' : 'status-inactive'}`}></div>
                          <div>
                            <h4 className="font-medium">{strategy.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {strategy.symbols.join(', ')} • {formatCurrency(strategy.positionSize)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">Paper Trading</Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleStrategyMutation.mutate({
                              id: strategy.id,
                              isActive: !strategy.isActive
                            })}
                            disabled={toggleStrategyMutation.isPending}
                            data-testid={`button-toggle-paper-${strategy.id}`}
                          >
                            {strategy.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No paper trading strategies</p>
                    <p className="text-sm">Create strategies with paper trading enabled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Paper Trades */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Paper Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {paperTrades && paperTrades.length > 0 ? (
              <div className="space-y-4">
                {paperTrades.map((trade) => (
                  <div 
                    key={trade.id} 
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    data-testid={`paper-trade-${trade.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="text-xs">PAPER</Badge>
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(trade.executedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">
                        {trade.side.toUpperCase()} {trade.quantity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @ {formatCurrency(parseFloat(trade.price))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${trade.pnl && parseFloat(trade.pnl) >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {trade.pnl ? formatCurrency(parseFloat(trade.pnl)) : '--'}
                      </p>
                      <p className="text-xs text-muted-foreground">P&L</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingDown className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No paper trades yet</h3>
                <p className="mb-6">Start by creating a strategy or placing a manual practice trade</p>
                <Button 
                  onClick={() => setIsOrderModalOpen(true)}
                  data-testid="button-first-paper-trade"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Place Your First Paper Trade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paper Trading Benefits */}
        <Card className="border-success/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <TestTube className="w-8 h-8 text-success" />
              <div>
                <h3 className="font-semibold text-success">Paper Trading Benefits</h3>
                <p className="text-sm text-muted-foreground">
                  Test your strategies risk-free with simulated funds. Perfect for learning, 
                  strategy development, and building confidence before live trading.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paper Trade Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="paper-trade-modal-title">Place Paper Trade</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitPaperTrade} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={orderForm.symbol}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                  required
                  data-testid="input-paper-symbol"
                />
              </div>
              
              <div>
                <Label htmlFor="side">Side</Label>
                <Select value={orderForm.side} onValueChange={(value: "buy" | "sell") => setOrderForm(prev => ({ ...prev, side: value }))}>
                  <SelectTrigger data-testid="select-paper-side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={orderForm.quantity}
                onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="100"
                required
                data-testid="input-paper-quantity"
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <TestTube className="w-4 h-4 inline mr-2" />
                This is a simulated trade using paper money. No real funds will be used.
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createPaperTradeMutation.isPending}
                data-testid="button-submit-paper-trade"
              >
                {createPaperTradeMutation.isPending ? "Executing..." : "Execute Paper Trade"}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsOrderModalOpen(false)}
                data-testid="button-cancel-paper-trade"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

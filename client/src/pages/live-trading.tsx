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
import { alpacaClient } from "@/lib/alpaca-client";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Play, 
  Pause, 
  StopCircle,
  Plus,
  Minus
} from "lucide-react";
import { type Strategy, type Trade } from "@shared/schema";

export default function LiveTrading() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
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

  // Fetch live trading strategies
  const { data: liveStrategies, isLoading: strategiesLoading } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies'],
    select: (data) => data?.filter(strategy => !strategy.isPaperTrading) || [],
    refetchInterval: 10000,
  });

  // Fetch Alpaca account info
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['/api/alpaca/account'],
    refetchInterval: 30000,
  });

  // Fetch current positions
  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/alpaca/positions'],
    refetchInterval: 15000,
  });

  // Fetch recent live trades
  const { data: recentTrades } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
    select: (data) => data?.filter(trade => !trade.isPaperTrade).slice(0, 10) || [],
    refetchInterval: 10000,
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'portfolio_update' || message.type === 'trade_update') {
        setRealtimeData(message.data);
        queryClient.invalidateQueries({ queryKey: ['/api/alpaca/account'] });
        queryClient.invalidateQueries({ queryKey: ['/api/alpaca/positions'] });
      }
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await alpacaClient.createOrder(orderData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alpaca/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      toast({
        title: "Success",
        description: "Order submitted successfully",
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
        description: error.message || "Failed to submit order",
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

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderForm.symbol || !orderForm.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      symbol: orderForm.symbol.toUpperCase(),
      qty: parseInt(orderForm.quantity),
      side: orderForm.side,
      type: orderForm.orderType,
      time_in_force: "day" as const,
      ...(orderForm.orderType === "limit" && orderForm.limitPrice && {
        limit_price: parseFloat(orderForm.limitPrice)
      }),
    };

    createOrderMutation.mutate(orderData);
  };

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

  if (strategiesLoading || accountLoading) {
    return (
      <div>
        <Header title="Live Trading" description="Monitor and execute live trades" />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading live trading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Live Trading" description="Monitor and execute live trades" />
      
      <div className="p-6 space-y-6">
        {/* Account Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Equity</p>
                  <p className="text-2xl font-bold" data-testid="account-equity">
                    {account ? formatCurrency((account as any).equity) : '--'}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Buying Power</p>
                  <p className="text-2xl font-bold" data-testid="buying-power">
                    {account ? formatCurrency((account as any).daytime_buying_power) : '--'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Day Trades</p>
                  <p className="text-2xl font-bold" data-testid="day-trades">
                    {(account as any)?.day_trade_count || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Strategies</p>
                  <p className="text-2xl font-bold" data-testid="active-live-strategies">
                    {liveStrategies?.filter(s => s.isActive).length || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Trade & Live Strategies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Trade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Quick Trade
                <Button 
                  size="sm"
                  onClick={() => setIsOrderModalOpen(true)}
                  data-testid="button-quick-trade"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Order
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Quick trade orders</p>
                  <p className="text-sm">Place manual orders outside of strategies</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Strategies */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Live Trading Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                {liveStrategies && liveStrategies.length > 0 ? (
                  <div className="space-y-4">
                    {liveStrategies.map((strategy) => (
                      <div 
                        key={strategy.id} 
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                        data-testid={`live-strategy-${strategy.id}`}
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
                          <Badge variant={strategy.isActive ? "default" : "secondary"}>
                            {strategy.isActive ? "Active" : "Inactive"}
                          </Badge>
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
                            data-testid={`button-toggle-live-${strategy.id}`}
                          >
                            {strategy.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No live trading strategies</p>
                    <p className="text-sm">Create strategies and enable live trading to start</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Positions & Recent Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Positions */}
          <Card>
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {positionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : positions && (positions as any).length > 0 ? (
                <div className="space-y-4">
                  {(positions as any).map((position: any) => {
                    const unrealizedPnL = parseFloat(position.unrealized_pl);
                    const marketValue = parseFloat(position.market_value);
                    return (
                      <div 
                        key={position.symbol} 
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        data-testid={`position-${position.symbol}`}
                      >
                        <div>
                          <p className="font-medium">{position.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {position.qty} shares
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(marketValue)}</p>
                          <p className={`text-sm ${unrealizedPnL >= 0 ? 'profit-text' : 'loss-text'}`}>
                            {formatCurrency(unrealizedPnL)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Minus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No open positions</p>
                  <p className="text-sm">Positions will appear here when trades execute</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Live Trades */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Live Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTrades && recentTrades.length > 0 ? (
                <div className="space-y-4">
                  {recentTrades.map((trade) => (
                    <div 
                      key={trade.id} 
                      className="flex items-center justify-between"
                      data-testid={`live-trade-${trade.id}`}
                    >
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(trade.executedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {trade.side.toUpperCase()} {trade.quantity}
                        </p>
                        <p className={`text-sm ${trade.pnl && parseFloat(trade.pnl) >= 0 ? 'profit-text' : 'loss-text'}`}>
                          {trade.pnl ? formatCurrency(parseFloat(trade.pnl)) : formatCurrency(parseFloat(trade.price))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent live trades</p>
                  <p className="text-sm">Live trades will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Risk Warning */}
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Live Trading Warning</h3>
                <p className="text-sm text-muted-foreground">
                  You are trading with real money. All trades will affect your actual account balance. 
                  Monitor your strategies carefully and use appropriate risk management.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="order-modal-title">Place New Order</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={orderForm.symbol}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                  required
                  data-testid="input-order-symbol"
                />
              </div>
              
              <div>
                <Label htmlFor="side">Side</Label>
                <Select value={orderForm.side} onValueChange={(value: "buy" | "sell") => setOrderForm(prev => ({ ...prev, side: value }))}>
                  <SelectTrigger data-testid="select-order-side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="100"
                  required
                  data-testid="input-order-quantity"
                />
              </div>
              
              <div>
                <Label htmlFor="orderType">Order Type</Label>
                <Select value={orderForm.orderType} onValueChange={(value: "market" | "limit") => setOrderForm(prev => ({ ...prev, orderType: value }))}>
                  <SelectTrigger data-testid="select-order-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {orderForm.orderType === "limit" && (
              <div>
                <Label htmlFor="limitPrice">Limit Price</Label>
                <Input
                  id="limitPrice"
                  type="number"
                  step="0.01"
                  value={orderForm.limitPrice}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, limitPrice: e.target.value }))}
                  placeholder="150.00"
                  data-testid="input-limit-price"
                />
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createOrderMutation.isPending}
                data-testid="button-submit-order"
              >
                {createOrderMutation.isPending ? "Submitting..." : "Submit Order"}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsOrderModalOpen(false)}
                data-testid="button-cancel-order"
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

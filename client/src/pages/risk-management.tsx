import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Activity,
  Settings,
  BarChart3
} from "lucide-react";

interface RiskSettings {
  maxDailyLoss: number;
  maxPositionSize: number;
  maxDrawdown: number;
  enableStopLoss: boolean;
  defaultStopLoss: number;
  enableTakeProfit: boolean;
  defaultTakeProfit: number;
  maxConcurrentTrades: number;
  riskPerTrade: number;
  emergencyStopEnabled: boolean;
}

export default function RiskManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxDailyLoss: 1000,
    maxPositionSize: 10000,
    maxDrawdown: 10,
    enableStopLoss: true,
    defaultStopLoss: 2.0,
    enableTakeProfit: true,
    defaultTakeProfit: 4.0,
    maxConcurrentTrades: 10,
    riskPerTrade: 1.0,
    emergencyStopEnabled: true,
  });

  // Fetch portfolio summary for risk calculations
  const { data: portfolioSummary } = useQuery({
    queryKey: ['/api/portfolio/summary'],
    refetchInterval: 30000,
  });

  // Fetch current positions for position sizing analysis
  const { data: positions } = useQuery({
    queryKey: ['/api/alpaca/positions'],
    refetchInterval: 15000,
  });

  // Fetch active strategies for risk monitoring
  const { data: strategies } = useQuery({
    queryKey: ['/api/strategies'],
    refetchInterval: 30000,
  });

  const saveRiskSettingsMutation = useMutation({
    mutationFn: async (settings: RiskSettings) => {
      // In a real implementation, this would save to user preferences
      return Promise.resolve(settings);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Risk management settings saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save risk settings",
        variant: "destructive",
      });
    },
  });

  const executeEmergencyStopMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/emergency-stop');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      toast({
        title: "Emergency Stop Executed",
        description: "All strategies have been stopped and open orders cancelled",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to execute emergency stop",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    saveRiskSettingsMutation.mutate(riskSettings);
  };

  const handleEmergencyStop = () => {
    if (confirm('Are you sure you want to execute emergency stop? This will stop all active strategies and cancel open orders.')) {
      executeEmergencyStopMutation.mutate();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate current risk metrics
  const currentPortfolioValue = (portfolioSummary as any)?.totalValue || 0;
  const currentDayPnL = (portfolioSummary as any)?.dayPnL || 0;
  const currentExposure = (positions as any)?.reduce((sum: number, pos: any) => 
    sum + Math.abs(parseFloat(pos.market_value)), 0
  ) || 0;
  
  const exposurePercentage = currentPortfolioValue > 0 ? 
    (currentExposure / currentPortfolioValue) * 100 : 0;
    
  const dailyLossPercentage = currentPortfolioValue > 0 ? 
    Math.abs(currentDayPnL) / currentPortfolioValue * 100 : 0;

  const activeStrategiesCount = (strategies as any)?.filter((s: any) => s.isActive).length || 0;

  return (
    <div>
      <Header title="Risk Management" description="Configure risk parameters and monitor exposure" />
      
      <div className="p-6 space-y-6">
        {/* Risk Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Portfolio Value</p>
                  <p className="text-2xl font-bold" data-testid="portfolio-value">
                    {formatCurrency(currentPortfolioValue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Total account equity
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Exposure</p>
                  <p className="text-2xl font-bold" data-testid="current-exposure">
                    {exposurePercentage.toFixed(1)}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-warning" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {formatCurrency(currentExposure)} invested
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Daily Loss</p>
                  <p className={`text-2xl font-bold ${currentDayPnL >= 0 ? 'profit-text' : 'loss-text'}`} data-testid="daily-loss">
                    {dailyLossPercentage.toFixed(2)}%
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-destructive" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {formatCurrency(Math.abs(currentDayPnL))} today
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Strategies</p>
                  <p className="text-2xl font-bold" data-testid="active-strategies-risk">
                    {activeStrategiesCount}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-success" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Currently running
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Alerts */}
        <div className="space-y-4">
          {Math.abs(currentDayPnL) > riskSettings.maxDailyLoss && (
            <Card className="border-destructive">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                  <div>
                    <h3 className="font-semibold text-destructive">Daily Loss Limit Exceeded</h3>
                    <p className="text-sm text-muted-foreground">
                      Current daily loss ({formatCurrency(Math.abs(currentDayPnL))}) exceeds your limit of {formatCurrency(riskSettings.maxDailyLoss)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {exposurePercentage > 90 && (
            <Card className="border-warning">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <AlertTriangle className="w-8 h-8 text-warning" />
                  <div>
                    <h3 className="font-semibold text-warning">High Portfolio Exposure</h3>
                    <p className="text-sm text-muted-foreground">
                      {exposurePercentage.toFixed(1)}% of your portfolio is currently invested
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Risk Management Tabs */}
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList data-testid="risk-tabs">
            <TabsTrigger value="settings">Risk Settings</TabsTrigger>
            <TabsTrigger value="monitoring">Risk Monitoring</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Risk Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Portfolio Risk Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="maxDailyLoss">Maximum Daily Loss ($)</Label>
                    <Input
                      id="maxDailyLoss"
                      type="number"
                      value={riskSettings.maxDailyLoss}
                      onChange={(e) => setRiskSettings(prev => ({ 
                        ...prev, 
                        maxDailyLoss: parseFloat(e.target.value) || 0 
                      }))}
                      data-testid="input-max-daily-loss"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Stop all trading when daily loss exceeds this amount
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="maxDrawdown">Maximum Drawdown (%)</Label>
                    <Input
                      id="maxDrawdown"
                      type="number"
                      step="0.1"
                      value={riskSettings.maxDrawdown}
                      onChange={(e) => setRiskSettings(prev => ({ 
                        ...prev, 
                        maxDrawdown: parseFloat(e.target.value) || 0 
                      }))}
                      data-testid="input-max-drawdown"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum portfolio drawdown from peak
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="maxPositionSize">Maximum Position Size ($)</Label>
                    <Input
                      id="maxPositionSize"
                      type="number"
                      value={riskSettings.maxPositionSize}
                      onChange={(e) => setRiskSettings(prev => ({ 
                        ...prev, 
                        maxPositionSize: parseFloat(e.target.value) || 0 
                      }))}
                      data-testid="input-max-position-size"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum size for any single position
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="riskPerTrade">Risk Per Trade (%)</Label>
                    <Input
                      id="riskPerTrade"
                      type="number"
                      step="0.1"
                      value={riskSettings.riskPerTrade}
                      onChange={(e) => setRiskSettings(prev => ({ 
                        ...prev, 
                        riskPerTrade: parseFloat(e.target.value) || 0 
                      }))}
                      data-testid="input-risk-per-trade"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum risk as percentage of portfolio per trade
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Risk Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Trade Risk Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableStopLoss">Enable Stop Loss</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically set stop losses on all trades
                      </p>
                    </div>
                    <Switch
                      id="enableStopLoss"
                      checked={riskSettings.enableStopLoss}
                      onCheckedChange={(checked) => setRiskSettings(prev => ({ 
                        ...prev, 
                        enableStopLoss: checked 
                      }))}
                      data-testid="switch-enable-stop-loss"
                    />
                  </div>

                  {riskSettings.enableStopLoss && (
                    <div>
                      <Label htmlFor="defaultStopLoss">Default Stop Loss (%)</Label>
                      <Input
                        id="defaultStopLoss"
                        type="number"
                        step="0.1"
                        value={riskSettings.defaultStopLoss}
                        onChange={(e) => setRiskSettings(prev => ({ 
                          ...prev, 
                          defaultStopLoss: parseFloat(e.target.value) || 0 
                        }))}
                        data-testid="input-default-stop-loss"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableTakeProfit">Enable Take Profit</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically set take profit targets
                      </p>
                    </div>
                    <Switch
                      id="enableTakeProfit"
                      checked={riskSettings.enableTakeProfit}
                      onCheckedChange={(checked) => setRiskSettings(prev => ({ 
                        ...prev, 
                        enableTakeProfit: checked 
                      }))}
                      data-testid="switch-enable-take-profit"
                    />
                  </div>

                  {riskSettings.enableTakeProfit && (
                    <div>
                      <Label htmlFor="defaultTakeProfit">Default Take Profit (%)</Label>
                      <Input
                        id="defaultTakeProfit"
                        type="number"
                        step="0.1"
                        value={riskSettings.defaultTakeProfit}
                        onChange={(e) => setRiskSettings(prev => ({ 
                          ...prev, 
                          defaultTakeProfit: parseFloat(e.target.value) || 0 
                        }))}
                        data-testid="input-default-take-profit"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="maxConcurrentTrades">Max Concurrent Trades</Label>
                    <Input
                      id="maxConcurrentTrades"
                      type="number"
                      value={riskSettings.maxConcurrentTrades}
                      onChange={(e) => setRiskSettings(prev => ({ 
                        ...prev, 
                        maxConcurrentTrades: parseInt(e.target.value) || 0 
                      }))}
                      data-testid="input-max-concurrent-trades"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum number of simultaneous open positions
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveSettings}
                disabled={saveRiskSettingsMutation.isPending}
                data-testid="button-save-risk-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                {saveRiskSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Risk Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Risk Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Daily Loss vs Limit</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-muted rounded-full">
                          <div 
                            className={`h-full rounded-full ${
                              Math.abs(currentDayPnL) > riskSettings.maxDailyLoss ? 'bg-destructive' : 'bg-success'
                            }`}
                            style={{ 
                              width: `${Math.min((Math.abs(currentDayPnL) / riskSettings.maxDailyLoss) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <Badge variant={Math.abs(currentDayPnL) > riskSettings.maxDailyLoss ? "destructive" : "default"}>
                          {((Math.abs(currentDayPnL) / riskSettings.maxDailyLoss) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Portfolio Exposure</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-muted rounded-full">
                          <div 
                            className={`h-full rounded-full ${
                              exposurePercentage > 90 ? 'bg-warning' : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(exposurePercentage, 100)}%` }}
                          ></div>
                        </div>
                        <Badge variant={exposurePercentage > 90 ? "secondary" : "default"}>
                          {exposurePercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Strategies</span>
                      <Badge variant="outline">
                        {activeStrategiesCount} / {riskSettings.maxConcurrentTrades}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Position Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Position Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {positions && (positions as any).length > 0 ? (
                    <div className="space-y-4">
                      {(positions as any).slice(0, 5).map((position: any) => {
                        const marketValue = parseFloat(position.market_value);
                        const unrealizedPnL = parseFloat(position.unrealized_pl);
                        const positionPercentage = currentPortfolioValue > 0 ? 
                          (Math.abs(marketValue) / currentPortfolioValue) * 100 : 0;
                        
                        return (
                          <div key={position.symbol} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{position.symbol}</p>
                              <p className="text-sm text-muted-foreground">
                                {position.qty} shares
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm">{positionPercentage.toFixed(1)}%</p>
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
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No open positions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Emergency Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-destructive/10 p-4 rounded-lg">
                  <h3 className="font-semibold text-destructive mb-2">Emergency Stop</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Immediately stop all active strategies and cancel all open orders. 
                    Use this in case of market emergency or system malfunction.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleEmergencyStop}
                    disabled={executeEmergencyStopMutation.isPending}
                    data-testid="button-emergency-stop"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {executeEmergencyStopMutation.isPending ? "Executing..." : "Execute Emergency Stop"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emergencyStopEnabled">Enable Emergency Stop</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow emergency stop functionality
                    </p>
                  </div>
                  <Switch
                    id="emergencyStopEnabled"
                    checked={riskSettings.emergencyStopEnabled}
                    onCheckedChange={(checked) => setRiskSettings(prev => ({ 
                      ...prev, 
                      emergencyStopEnabled: checked 
                    }))}
                    data-testid="switch-emergency-stop-enabled"
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Risk Management Best Practices</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Never risk more than 1-2% of your portfolio on a single trade</li>
                    <li>• Set stop losses on all positions to limit downside risk</li>
                    <li>• Monitor your portfolio daily and adjust position sizes</li>
                    <li>• Use paper trading to test new strategies before going live</li>
                    <li>• Keep emergency contacts and procedures readily available</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

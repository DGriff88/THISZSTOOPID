import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StrategyModal from "@/components/modals/strategy-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Target,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
import { type Strategy, type PatternStrategyParameters } from "@shared/schema";

// Type guard to safely extract pattern parameters
function getPatternParams(parameters: any): PatternStrategyParameters {
  if (!parameters || typeof parameters !== 'object') {
    return {};
  }
  return parameters as PatternStrategyParameters;
}

export default function Strategies() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: strategies, isLoading } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies'],
    refetchInterval: 30000,
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update strategy",
        variant: "destructive",
      });
    },
  });

  const deleteStrategyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/strategies/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      toast({
        title: "Success",
        description: "Strategy deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete strategy",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setIsModalOpen(true);
  };

  const handleToggle = (strategy: Strategy) => {
    toggleStrategyMutation.mutate({
      id: strategy.id,
      isActive: !strategy.isActive,
    });
  };

  const handleDelete = (strategy: Strategy) => {
    if (confirm(`Are you sure you want to delete "${strategy.name}"?`)) {
      deleteStrategyMutation.mutate(strategy.id);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStrategyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      // Traditional Technical Indicators
      moving_average: 'Moving Average',
      rsi: 'RSI',
      bollinger_bands: 'Bollinger Bands',
      macd: 'MACD',
      // Pattern-Based Strategies
      head_shoulders_bearish: 'Head & Shoulders Bearish',
      head_shoulders_bullish: 'Head & Shoulders Bullish',
      reversal_flag_bearish: 'Reversal Flag Bearish',
      reversal_flag_bullish: 'Reversal Flag Bullish',
      three_line_strike_bearish: 'Three Line Strike Bearish',
      three_line_strike_bullish: 'Three Line Strike Bullish',
      trap_bearish: 'Trap Bearish',
      trap_bullish: 'Trap Bullish',
      reversal_candlestick: 'Reversal Candlestick',
      common_trading_patterns: 'Common Trading Patterns',
      // Custom
      custom: 'Custom',
    };
    return types[type] || type;
  };

  const isPatternStrategy = (type: string) => {
    const patternTypes = [
      'head_shoulders_bearish', 'head_shoulders_bullish',
      'reversal_flag_bearish', 'reversal_flag_bullish',
      'three_line_strike_bearish', 'three_line_strike_bullish',
      'trap_bearish', 'trap_bullish',
      'reversal_candlestick', 'common_trading_patterns'
    ];
    return patternTypes.includes(type);
  };

  if (isLoading) {
    return (
      <div>
        <Header 
          title="Trading Strategies" 
          description="Manage your automated trading strategies" 
        />
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Trading Strategies" 
        description="Manage your automated trading strategies" 
      />
      
      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Strategies</p>
                  <p className="text-2xl font-bold" data-testid="total-strategies">
                    {strategies?.length || 0}
                  </p>
                </div>
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-success" data-testid="active-strategies">
                    {strategies?.filter(s => s.isActive).length || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paper Trading</p>
                  <p className="text-2xl font-bold text-warning" data-testid="paper-strategies">
                    {strategies?.filter(s => s.isPaperTrading).length || 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Live Trading</p>
                  <p className="text-2xl font-bold text-primary" data-testid="live-strategies">
                    {strategies?.filter(s => !s.isPaperTrading).length || 0}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Strategy Button */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Your Strategies</h3>
            <p className="text-sm text-muted-foreground">
              Manage and monitor your trading strategies
            </p>
          </div>
          <Button 
            onClick={() => {
              setEditingStrategy(undefined);
              setIsModalOpen(true);
            }}
            data-testid="button-create-strategy"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </div>

        {/* Strategy Grid */}
        {strategies && strategies.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {strategies.map((strategy) => {
              const patternParams = isPatternStrategy(strategy.type) && strategy.parameters 
                ? getPatternParams(strategy.parameters) 
                : null;
              
              return (
                <Card 
                  key={strategy.id} 
                  className="relative"
                  data-testid={`strategy-card-${strategy.id}`}
                >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${strategy.isActive ? 'status-active' : 'status-inactive'}`}></div>
                        <CardTitle className="text-lg">{strategy.name}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getStrategyTypeLabel(strategy.type)}
                        </Badge>
                        {isPatternStrategy(strategy.type) && (
                          <Badge variant="secondary" className="text-xs">
                            Pattern
                          </Badge>
                        )}
                        <Badge 
                          variant={strategy.isPaperTrading ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {strategy.isPaperTrading ? "Paper" : "Live"}
                        </Badge>
                        <Badge 
                          variant={strategy.isActive ? "default" : "outline"}
                          className="text-xs"
                        >
                          {strategy.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Symbols</p>
                    <p className="text-sm font-mono">
                      {strategy.symbols.join(', ')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Position Size</p>
                      <p className="font-medium">{formatCurrency(strategy.positionSize)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-medium">
                        {strategy.stopLoss ? `${strategy.stopLoss}%` : 'None'}
                      </p>
                    </div>
                  </div>

                  {/* Pattern-specific configuration display */}
                  {patternParams && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">Pattern Config</Badge>
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {patternParams.confidenceThreshold && (
                          <div>
                            <span className="text-muted-foreground">Confidence:</span>
                            <span className="ml-1 font-medium">{patternParams.confidenceThreshold}%</span>
                          </div>
                        )}
                        {patternParams.timeframe && (
                          <div>
                            <span className="text-muted-foreground">Timeframe:</span>
                            <span className="ml-1 font-medium">{patternParams.timeframe}</span>
                          </div>
                        )}
                        {patternParams.minPatternSize && (
                          <div>
                            <span className="text-muted-foreground">Min Size:</span>
                            <span className="ml-1 font-medium">{patternParams.minPatternSize}</span>
                          </div>
                        )}
                        {patternParams.maxPatternAge && (
                          <div>
                            <span className="text-muted-foreground">Max Age:</span>
                            <span className="ml-1 font-medium">{patternParams.maxPatternAge}h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {strategy.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{strategy.description}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(strategy.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(strategy)}
                        data-testid={`button-edit-${strategy.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggle(strategy)}
                        disabled={toggleStrategyMutation.isPending}
                        data-testid={`button-toggle-${strategy.id}`}
                      >
                        {strategy.isActive ? 
                          <Pause className="w-4 h-4" /> : 
                          <Play className="w-4 h-4" />
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(strategy)}
                        disabled={deleteStrategyMutation.isPending}
                        data-testid={`button-delete-${strategy.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No strategies yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first trading strategy to get started with automated trading.
              </p>
              <Button 
                onClick={() => {
                  setEditingStrategy(undefined);
                  setIsModalOpen(true);
                }}
                data-testid="button-create-first-strategy"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Strategy
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <StrategyModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStrategy(undefined);
        }}
        strategy={editingStrategy}
      />
    </div>
  );
}

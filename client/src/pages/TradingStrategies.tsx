import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Target, 
  Activity, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Brain,
  Zap,
  Eye,
  BarChart3
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AlgorithmicStrategy, StrategyStockPick } from "@shared/schema";

export default function TradingStrategies() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  // Fetch algorithmic strategies
  const { data: strategies = [], isLoading: strategiesLoading } = useQuery({
    queryKey: ['/api/algorithmic-strategies'],
  });

  // Fetch active stock picks
  const { data: stockPicks = [], isLoading: picksLoading } = useQuery({
    queryKey: ['/api/stock-picks/active'],
  });

  // Fetch picks for selected strategy
  const { data: strategyPicks = [] } = useQuery({
    queryKey: ['/api/algorithmic-strategies', selectedStrategy, 'picks'],
    enabled: !!selectedStrategy,
  });

  // Create default strategy mutation
  const createDefaultMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/algorithmic-strategies/create-default'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/algorithmic-strategies'] });
    },
  });

  // Generate picks mutation
  const generatePicksMutation = useMutation({
    mutationFn: (strategyId: string) => 
      apiRequest('POST', `/api/algorithmic-strategies/${strategyId}/generate-picks`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-picks/active'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/algorithmic-strategies', selectedStrategy, 'picks'] 
      });
    },
  });

  const handleGeneratePicks = (strategyId: string) => {
    generatePicksMutation.mutate(strategyId);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const getEntrySignalBadge = (signal: string) => {
    const colors = {
      emaTrend: 'bg-blue-500/20 text-blue-300',
      oversoldBounce: 'bg-green-500/20 text-green-300',
      momentumPop: 'bg-purple-500/20 text-purple-300',
    };
    return colors[signal as keyof typeof colors] || 'bg-gray-500/20 text-gray-300';
  };

  if (strategiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading strategies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="strategies-header">
            <Brain className="w-8 h-8 text-primary" />
            Algorithmic Trading Strategies
          </h1>
          <p className="text-muted-foreground mt-2">
            ALGOTRADER BRAINBOX - AI-powered stock selection and trading logic guides
          </p>
        </div>
        
        {strategies.length === 0 && (
          <Button 
            onClick={() => createDefaultMutation.mutate()}
            disabled={createDefaultMutation.isPending}
            data-testid="button-create-default-strategy"
          >
            <Zap className="w-4 h-4 mr-2" />
            {createDefaultMutation.isPending ? "Creating..." : "Create ALGOTRADER Strategy"}
          </Button>
        )}
      </div>

      {strategies.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Trading Strategies Found</h3>
          <p className="text-muted-foreground mb-6">
            Create your first ALGOTRADER BRAINBOX strategy to start generating intelligent stock picks
          </p>
          <Button 
            onClick={() => createDefaultMutation.mutate()}
            disabled={createDefaultMutation.isPending}
            data-testid="button-create-first-strategy"
          >
            <Zap className="w-4 h-4 mr-2" />
            {createDefaultMutation.isPending ? "Creating..." : "Create Your First Strategy"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategies List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Your Trading Strategies
            </h2>
            
            {strategies.map((strategy: AlgorithmicStrategy) => (
              <Card 
                key={strategy.id} 
                className={`cursor-pointer transition-all ${
                  selectedStrategy === strategy.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedStrategy(strategy.id)}
                data-testid={`strategy-card-${strategy.id}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {strategy.strategyName}
                        {strategy.isActive ? (
                          <Badge variant="default" className="bg-green-500/20 text-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{strategy.description}</CardDescription>
                    </div>
                    
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGeneratePicks(strategy.id);
                      }}
                      disabled={generatePicksMutation.isPending}
                      data-testid={`button-generate-picks-${strategy.id}`}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      {generatePicksMutation.isPending ? "Scanning..." : "Generate Picks"}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(strategy.dailyTarget)}
                      </p>
                      <p className="text-sm text-muted-foreground">Daily Target</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">
                        {formatCurrency(strategy.dailyLossLimit)}
                      </p>
                      <p className="text-sm text-muted-foreground">Loss Limit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {formatCurrency(strategy.maxRiskPerTrade)}
                      </p>
                      <p className="text-sm text-muted-foreground">Max Risk/Trade</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-400">
                        {strategy.riskRewardMin}:1
                      </p>
                      <p className="text-sm text-muted-foreground">Risk/Reward</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {strategy.catalystSources.map((source: string) => (
                      <Badge key={source} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stock Picks Panel */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {selectedStrategy ? "Strategy Picks" : "Active Stock Picks"}
            </h2>
            
            <div className="space-y-3">
              {(selectedStrategy ? strategyPicks : stockPicks).map((pick: StrategyStockPick) => (
                <Card key={pick.id} data-testid={`stock-pick-${pick.symbol}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{pick.symbol}</span>
                        <Badge className={getEntrySignalBadge(pick.entrySignal)}>
                          {pick.entrySignal}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(pick.price)}</p>
                        {pick.scannerScore && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <BarChart3 className="w-3 h-3" />
                            {pick.scannerScore}% score
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{pick.reason}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {pick.rvol && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          RVOL: {pick.rvol}x
                        </div>
                      )}
                      {pick.rsi && (
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          RSI: {pick.rsi}
                        </div>
                      )}
                      {pick.bollingerPosition && (
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          BB: {pick.bollingerPosition}
                        </div>
                      )}
                      {pick.macdCurl && (
                        <div className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          MACD Curl
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(selectedStrategy ? strategyPicks : stockPicks).length === 0 && (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {selectedStrategy ? "No picks generated for this strategy" : "No active stock picks"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate picks using the scan button on your strategies
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
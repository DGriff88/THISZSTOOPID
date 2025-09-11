import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Strategy, type PatternStrategyParameters } from "@shared/schema";

interface StrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy?: Strategy;
}

const strategyTypes = [
  // Traditional Technical Indicators
  { value: 'moving_average', label: 'Moving Average Crossover', category: 'technical', description: 'Buy/sell when fast MA crosses slow MA' },
  { value: 'rsi', label: 'RSI Oversold/Overbought', category: 'technical', description: 'Trade based on RSI oversold/overbought levels' },
  { value: 'bollinger_bands', label: 'Bollinger Bands', category: 'technical', description: 'Trade when price touches or breaks bands' },
  { value: 'macd', label: 'MACD Strategy', category: 'technical', description: 'MACD signal line crossovers and divergences' },
  
  // Chart Pattern Strategies
  { value: 'head_shoulders_bearish', label: 'Head & Shoulders Bearish', category: 'pattern', description: 'Classic reversal pattern indicating downtrend' },
  { value: 'head_shoulders_bullish', label: 'Head & Shoulders Bullish', category: 'pattern', description: 'Inverse H&S pattern indicating uptrend' },
  { value: 'reversal_flag_bearish', label: 'Reversal Flag Bearish', category: 'pattern', description: 'Flag pattern with bearish reversal signal' },
  { value: 'reversal_flag_bullish', label: 'Reversal Flag Bullish', category: 'pattern', description: 'Flag pattern with bullish reversal signal' },
  { value: 'three_line_strike_bearish', label: 'Three Line Strike Bearish', category: 'pattern', description: 'Three consecutive candles followed by reversal' },
  { value: 'three_line_strike_bullish', label: 'Three Line Strike Bullish', category: 'pattern', description: 'Three consecutive candles followed by reversal' },
  { value: 'trap_bearish', label: 'Trap Bearish', category: 'pattern', description: 'False breakout trap indicating reversal down' },
  { value: 'trap_bullish', label: 'Trap Bullish', category: 'pattern', description: 'False breakout trap indicating reversal up' },
  { value: 'reversal_candlestick', label: 'Reversal Candlestick Patterns', category: 'pattern', description: 'Various candlestick reversal patterns' },
  { value: 'common_trading_patterns', label: 'Common Trading Patterns', category: 'pattern', description: 'Collection of frequently used patterns' },
  
  // Custom
  { value: 'custom', label: 'Custom Algorithm', category: 'custom', description: 'User-defined custom strategy' },
];

const timeframeOptions = [
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '4h', label: '4 hours' },
  { value: '1d', label: '1 day' },
  { value: '1w', label: '1 week' },
];

// Type guard to check if parameters contain pattern configuration
function getPatternParams(parameters: any): PatternStrategyParameters {
  if (!parameters || typeof parameters !== 'object') {
    return {};
  }
  return parameters as PatternStrategyParameters;
}

export default function StrategyModal({ isOpen, onClose, strategy }: StrategyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract pattern parameters safely
  const patternParams = getPatternParams(strategy?.parameters);
  
  const [formData, setFormData] = useState({
    name: strategy?.name || '',
    type: strategy?.type || '',
    description: strategy?.description || '',
    symbols: strategy?.symbols?.join(', ') || '',
    positionSize: strategy?.positionSize || '1000',
    stopLoss: strategy?.stopLoss || '2.0',
    takeProfit: strategy?.takeProfit || '4.0',
    isPaperTrading: strategy?.isPaperTrading ?? true,
    isActive: strategy?.isActive ?? false,
    // Pattern-specific configuration
    confidenceThreshold: patternParams.confidenceThreshold?.toString() || '75',
    timeframe: patternParams.timeframe || '1h',
    minPatternSize: patternParams.minPatternSize?.toString() || '10',
    maxPatternAge: patternParams.maxPatternAge?.toString() || '24',
    rejectionCandleSize: patternParams.rejectionCandleSize?.toString() || '0.5',
    poleSize: patternParams.poleSize?.toString() || '2.0',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const isPatternStrategy = strategyTypes.find(t => t.value === data.type && t.category === 'pattern');
      const parameters = isPatternStrategy ? {
        confidenceThreshold: parseFloat(data.confidenceThreshold),
        timeframe: data.timeframe,
        minPatternSize: parseFloat(data.minPatternSize),
        maxPatternAge: parseFloat(data.maxPatternAge),
        rejectionCandleSize: parseFloat(data.rejectionCandleSize),
        poleSize: parseFloat(data.poleSize),
      } : {};

      const response = await apiRequest('POST', '/api/strategies', {
        ...data,
        symbols: data.symbols.split(',').map((s: string) => s.trim()).filter(Boolean),
        positionSize: parseFloat(data.positionSize),
        stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : null,
        takeProfit: data.takeProfit ? parseFloat(data.takeProfit) : null,
        parameters,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategies/performance'] });
      toast({
        title: "Success",
        description: "Strategy created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create strategy",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const isPatternStrategy = strategyTypes.find(t => t.value === data.type && t.category === 'pattern');
      const parameters = isPatternStrategy ? {
        confidenceThreshold: parseFloat(data.confidenceThreshold),
        timeframe: data.timeframe,
        minPatternSize: parseFloat(data.minPatternSize),
        maxPatternAge: parseFloat(data.maxPatternAge),
        rejectionCandleSize: parseFloat(data.rejectionCandleSize),
        poleSize: parseFloat(data.poleSize),
      } : {};

      const response = await apiRequest('PUT', `/api/strategies/${strategy?.id}`, {
        ...data,
        symbols: data.symbols.split(',').map((s: string) => s.trim()).filter(Boolean),
        positionSize: parseFloat(data.positionSize),
        stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : null,
        takeProfit: data.takeProfit ? parseFloat(data.takeProfit) : null,
        parameters,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/strategies/performance'] });
      toast({
        title: "Success",
        description: "Strategy updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update strategy",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (strategy) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isPatternStrategy = (type: string) => {
    return strategyTypes.find(t => t.value === type && t.category === 'pattern');
  };

  const getSelectedStrategy = () => {
    return strategyTypes.find(t => t.value === formData.type);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {strategy ? 'Edit Strategy' : 'Create New Strategy'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Strategy Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter strategy name"
              required
              data-testid="input-strategy-name"
            />
          </div>

          <div>
            <Label htmlFor="type">Strategy Type</Label>
            <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
              <SelectTrigger data-testid="select-strategy-type">
                <SelectValue placeholder="Select strategy type" />
              </SelectTrigger>
              <SelectContent>
                {/* Technical Indicators Group */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Technical Indicators
                </div>
                {strategyTypes
                  .filter(type => type.category === 'technical')
                  .map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                
                {/* Pattern-Based Strategies Group */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                  Pattern-Based Strategies
                </div>
                {strategyTypes
                  .filter(type => type.category === 'pattern')
                  .map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {type.label}
                          <Badge variant="outline" className="text-xs">Pattern</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                
                {/* Custom Group */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                  Custom
                </div>
                {strategyTypes
                  .filter(type => type.category === 'custom')
                  .map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {getSelectedStrategy() && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>{getSelectedStrategy()?.label}:</strong> {getSelectedStrategy()?.description}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the strategy"
              data-testid="input-description"
            />
          </div>

          <div>
            <Label htmlFor="symbols">Target Symbols</Label>
            <Input
              id="symbols"
              value={formData.symbols}
              onChange={(e) => handleChange('symbols', e.target.value)}
              placeholder="AAPL, MSFT, GOOGL"
              required
              data-testid="input-symbols"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Comma-separated list of stock symbols
            </p>
          </div>

          {/* Pattern-specific configuration */}
          {isPatternStrategy(formData.type) && (
            <>
              <Separator />
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Badge variant="secondary">Pattern Detection</Badge>
                    Configuration
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure pattern detection parameters for optimal signal quality
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="confidenceThreshold">Confidence Threshold (%)</Label>
                    <Input
                      id="confidenceThreshold"
                      type="number"
                      min="50"
                      max="99"
                      value={formData.confidenceThreshold}
                      onChange={(e) => handleChange('confidenceThreshold', e.target.value)}
                      placeholder="75"
                      data-testid="input-confidence-threshold"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher values = fewer but higher quality signals
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="timeframe">Timeframe</Label>
                    <Select value={formData.timeframe} onValueChange={(value) => handleChange('timeframe', value)}>
                      <SelectTrigger data-testid="select-timeframe">
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeframeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minPatternSize">Min Pattern Size</Label>
                    <Input
                      id="minPatternSize"
                      type="number"
                      min="5"
                      max="50"
                      value={formData.minPatternSize}
                      onChange={(e) => handleChange('minPatternSize', e.target.value)}
                      placeholder="10"
                      data-testid="input-min-pattern-size"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum number of candles for pattern
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="maxPatternAge">Max Pattern Age (hours)</Label>
                    <Input
                      id="maxPatternAge"
                      type="number"
                      min="1"
                      max="168"
                      value={formData.maxPatternAge}
                      onChange={(e) => handleChange('maxPatternAge', e.target.value)}
                      placeholder="24"
                      data-testid="input-max-pattern-age"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum age before pattern expires
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rejectionCandleSize">Rejection Candle Size (%)</Label>
                    <Input
                      id="rejectionCandleSize"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5.0"
                      value={formData.rejectionCandleSize}
                      onChange={(e) => handleChange('rejectionCandleSize', e.target.value)}
                      placeholder="0.5"
                      data-testid="input-rejection-candle-size"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum size for rejection candles
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="poleSize">Pole Size (%)</Label>
                    <Input
                      id="poleSize"
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="10.0"
                      value={formData.poleSize}
                      onChange={(e) => handleChange('poleSize', e.target.value)}
                      placeholder="2.0"
                      data-testid="input-pole-size"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum pole size for flag patterns
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="positionSize">Position Size ($)</Label>
              <Input
                id="positionSize"
                type="number"
                value={formData.positionSize}
                onChange={(e) => handleChange('positionSize', e.target.value)}
                placeholder="1000"
                required
                data-testid="input-position-size"
              />
            </div>
            
            <div>
              <Label htmlFor="stopLoss">Stop Loss (%)</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.1"
                value={formData.stopLoss}
                onChange={(e) => handleChange('stopLoss', e.target.value)}
                placeholder="2.0"
                data-testid="input-stop-loss"
              />
            </div>

            <div>
              <Label htmlFor="takeProfit">Take Profit (%)</Label>
              <Input
                id="takeProfit"
                type="number"
                step="0.1"
                value={formData.takeProfit}
                onChange={(e) => handleChange('takeProfit', e.target.value)}
                placeholder="4.0"
                data-testid="input-take-profit"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="paperTrading"
                checked={formData.isPaperTrading}
                onCheckedChange={(checked) => handleChange('isPaperTrading', !!checked)}
                data-testid="checkbox-paper-trading"
              />
              <Label htmlFor="paperTrading">Enable Paper Trading</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoStart"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleChange('isActive', !!checked)}
                data-testid="checkbox-auto-start"
              />
              <Label htmlFor="autoStart">Auto-start Strategy</Label>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit"
            >
              {createMutation.isPending || updateMutation.isPending 
                ? "Saving..." 
                : strategy ? "Update Strategy" : "Create Strategy"
              }
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

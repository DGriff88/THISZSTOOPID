import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Strategy } from "@shared/schema";

interface StrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy?: Strategy;
}

const strategyTypes = [
  { value: 'moving_average', label: 'Moving Average Crossover' },
  { value: 'rsi', label: 'RSI Oversold/Overbought' },
  { value: 'bollinger_bands', label: 'Bollinger Bands' },
  { value: 'macd', label: 'MACD Strategy' },
  { value: 'custom', label: 'Custom Algorithm' },
];

export default function StrategyModal({ isOpen, onClose, strategy }: StrategyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/strategies', {
        ...data,
        symbols: data.symbols.split(',').map((s: string) => s.trim()).filter(Boolean),
        positionSize: parseFloat(data.positionSize),
        stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : null,
        takeProfit: data.takeProfit ? parseFloat(data.takeProfit) : null,
        parameters: {}, // Default empty parameters
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
      const response = await apiRequest('PUT', `/api/strategies/${strategy?.id}`, {
        ...data,
        symbols: data.symbols.split(',').map((s: string) => s.trim()).filter(Boolean),
        positionSize: parseFloat(data.positionSize),
        stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : null,
        takeProfit: data.takeProfit ? parseFloat(data.takeProfit) : null,
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
                {strategyTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  History, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Target,
  FileText,
  Search
} from "lucide-react";
import { type Trade } from "@shared/schema";

export default function TradeHistory() {
  const [filters, setFilters] = useState({
    symbol: "",
    side: "all",
    status: "all",
    tradeType: "all", // all, live, paper
    dateRange: "30", // days
  });

  const [searchQuery, setSearchQuery] = useState("");

  const { data: allTrades, isLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades', { limit: 1000 }],
    refetchInterval: 30000,
  });

  // Filter trades based on current filters
  const filteredTrades = allTrades?.filter(trade => {
    if (filters.symbol && !trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
      return false;
    }
    
    if (filters.side !== "all" && trade.side !== filters.side) {
      return false;
    }
    
    if (filters.status !== "all" && trade.status !== filters.status) {
      return false;
    }
    
    if (filters.tradeType === "live" && trade.isPaperTrade) {
      return false;
    }
    
    if (filters.tradeType === "paper" && !trade.isPaperTrade) {
      return false;
    }
    
    if (searchQuery && !trade.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Date range filter
    const tradeDate = new Date(trade.executedAt);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(filters.dateRange));
    
    if (tradeDate < cutoffDate) {
      return false;
    }
    
    return true;
  }) || [];

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDateTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = () => {
    if (!filteredTrades.length) return;
    
    const csvContent = [
      'Date,Symbol,Side,Quantity,Price,P&L,Status,Type',
      ...filteredTrades.map(trade => [
        formatDateTime(trade.executedAt),
        trade.symbol,
        trade.side.toUpperCase(),
        trade.quantity,
        trade.price,
        trade.pnl || '0',
        trade.status,
        trade.isPaperTrade ? 'Paper' : 'Live'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const totalTrades = filteredTrades.length;
  const liveTrades = filteredTrades.filter(t => !t.isPaperTrade).length;
  const paperTrades = filteredTrades.filter(t => t.isPaperTrade).length;
  const totalPnL = filteredTrades.reduce((sum, trade) => 
    sum + (trade.pnl ? parseFloat(trade.pnl) : 0), 0
  );
  const winningTrades = filteredTrades.filter(t => t.pnl && parseFloat(t.pnl) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  if (isLoading) {
    return (
      <div>
        <Header title="Trade History" description="View and analyze your trading history" />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading trade history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Trade History" description="View and analyze your trading history" />
      
      <div className="p-6 space-y-6">
        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold" data-testid="total-trades-count">
                    {totalTrades}
                  </p>
                </div>
                <History className="w-8 h-8 text-primary" />
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <span>{liveTrades} Live • {paperTrades} Paper</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total P&L</p>
                  <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'profit-text' : 'loss-text'}`} data-testid="total-pnl">
                    {formatCurrency(totalPnL)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <span>Realized gains/losses</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold" data-testid="win-rate">
                    {winRate.toFixed(1)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-warning" />
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <span>{winningTrades} of {totalTrades} profitable</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Trade Size</p>
                  <p className="text-2xl font-bold" data-testid="avg-trade-size">
                    {filteredTrades.length > 0 
                      ? Math.round(filteredTrades.reduce((sum, t) => sum + t.quantity, 0) / filteredTrades.length)
                      : 0
                    }
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <span>Shares per trade</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
              <Button 
                onClick={handleExport}
                disabled={!filteredTrades.length}
                data-testid="button-export-trades"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="search">Search Symbol</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="AAPL, MSFT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                    data-testid="input-search-symbol"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="symbol-filter">Symbol Filter</Label>
                <Input
                  id="symbol-filter"
                  placeholder="Filter by symbol"
                  value={filters.symbol}
                  onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
                  data-testid="input-symbol-filter"
                />
              </div>

              <div>
                <Label htmlFor="side-filter">Side</Label>
                <Select value={filters.side} onValueChange={(value) => setFilters(prev => ({ ...prev, side: value }))}>
                  <SelectTrigger data-testid="select-side-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sides</SelectItem>
                    <SelectItem value="buy">Buy Only</SelectItem>
                    <SelectItem value="sell">Sell Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type-filter">Trade Type</Label>
                <Select value={filters.tradeType} onValueChange={(value) => setFilters(prev => ({ ...prev, tradeType: value }))}>
                  <SelectTrigger data-testid="select-type-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="live">Live Only</SelectItem>
                    <SelectItem value="paper">Paper Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-filter">Date Range</Label>
                <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                  <SelectTrigger data-testid="select-date-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trade History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Trade History ({filteredTrades.length} trades)</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTrades.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.map((trade) => (
                      <TableRow key={trade.id} data-testid={`trade-row-${trade.id}`}>
                        <TableCell className="font-mono text-sm">
                          {formatDateTime(trade.executedAt)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {trade.symbol}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                            {trade.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {trade.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(parseFloat(trade.price))}
                        </TableCell>
                        <TableCell className={`font-mono ${
                          trade.pnl && parseFloat(trade.pnl) >= 0 ? 'profit-text' : 'loss-text'
                        }`}>
                          {trade.pnl ? formatCurrency(parseFloat(trade.pnl)) : '--'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              trade.status === 'filled' ? 'default' :
                              trade.status === 'pending' ? 'secondary' : 'destructive'
                            }
                          >
                            {trade.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {trade.isPaperTrade ? (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                Paper
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-xs">
                                Live
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No trades found</h3>
                <p className="mb-4">
                  {allTrades?.length === 0 
                    ? "You haven't made any trades yet. Start by creating and running strategies."
                    : "No trades match your current filters. Try adjusting the search criteria."
                  }
                </p>
                {allTrades?.length === 0 && (
                  <Button onClick={() => window.location.href = '/strategies'}>
                    Create Your First Strategy
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

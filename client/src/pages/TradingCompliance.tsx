import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  DollarSign,
  Target,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

interface ComplianceStatus {
  daily: {
    pnl: number;
    tradeCount: number;
    redTrades: number;
    walkRuleTriggered: boolean;
    walkRuleReason?: string;
    totalRisk: number;
    remainingRisk: number;
    gtcOrdersCancelled: boolean;
  };
  weekly: {
    goal: number;
    stretchGoal: number;
    actual: number;
    totalTrades: number;
    winRate: string;
  };
  violations: any[];
  activeTrades: number;
  strayLegs: number;
}

interface RuleViolation {
  id: string;
  violationType: string;
  severity: string;
  description: string;
  ruleReference: string;
  detectedValue: string;
  allowedValue: string;
  userAcknowledged: boolean;
  detectedAt: string;
}

export default function TradingCompliance() {
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  // Get current compliance status
  const { data: compliance, isLoading: complianceLoading, refetch: refetchCompliance } = useQuery<ComplianceStatus>({
    queryKey: ['/api/compliance/status']
  });

  // Get rule violations
  const { data: violations, isLoading: violationsLoading, refetch: refetchViolations } = useQuery<RuleViolation[]>({
    queryKey: ['/api/compliance/violations']
  });

  // Check GTC orders
  const { data: gtcCheck } = useQuery({
    queryKey: ['/api/compliance/gtc-check']
  });

  const acknowledgeViolation = async (id: string) => {
    setAcknowledging(id);
    try {
      const response = await fetch(`/api/compliance/acknowledge-violation/${id}`, {
        method: 'POST'
      });
      if (response.ok) {
        refetchViolations();
        refetchCompliance();
      }
    } catch (error) {
      console.error('Error acknowledging violation:', error);
    } finally {
      setAcknowledging(null);
    }
  };

  const getRiskColor = (risk: number, max: number) => {
    const percentage = (risk / max) * 100;
    if (percentage < 50) return 'text-green-600 dark:text-green-400';
    if (percentage < 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600 dark:text-green-400';
    if (pnl < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'error': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  if (complianceLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading compliance status...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 bg-white dark:bg-black text-black dark:text-white">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-3xl font-bold">PIRATETRADER Compliance</h1>
      </div>

      {/* Walk Rule Status */}
      {compliance?.daily.walkRuleTriggered && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            🚶 <strong>WALK RULE TRIGGERED:</strong> {compliance.daily.walkRuleReason}. No more trades allowed today.
          </AlertDescription>
        </Alert>
      )}

      {/* GTC Orders Alert */}
      {gtcCheck?.needsCancellation && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            {gtcCheck.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Compliance */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-black dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daily Compliance
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Today's trading activity and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Daily P&L */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Daily P&L:</span>
              <span data-testid="daily-pnl" className={`font-bold ${getPnLColor(compliance?.daily.pnl || 0)}`}>
                {compliance?.daily.pnl >= 0 ? '+' : ''}${compliance?.daily.pnl?.toFixed(2) || '0.00'}
              </span>
            </div>

            {/* Walk Rule Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Walk Rule Progress</span>
                <span className="text-gray-600 dark:text-gray-400">
                  ${compliance?.daily.pnl?.toFixed(2) || '0.00'} / $200.00
                </span>
              </div>
              <Progress 
                value={Math.min((compliance?.daily.pnl || 0) / 200 * 100, 100)} 
                className="h-2"
              />
            </div>

            {/* Trade Count */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Trades Today:</span>
              <span data-testid="trade-count" className="font-bold text-black dark:text-white">
                {compliance?.daily.tradeCount || 0}
              </span>
            </div>

            {/* Red Trades */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Consecutive Losses:</span>
              <span data-testid="red-trades" className={`font-bold ${compliance?.daily.redTrades >= 2 ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>
                {compliance?.daily.redTrades || 0} / 3
              </span>
            </div>

            {/* Risk Usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Daily Risk Used</span>
                <span className={getRiskColor(compliance?.daily.totalRisk || 0, 240)}>
                  ${compliance?.daily.totalRisk?.toFixed(2) || '0.00'} / $240.00
                </span>
              </div>
              <Progress 
                value={(compliance?.daily.totalRisk || 0) / 240 * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Paycheck */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-black dark:text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Weekly Paycheck
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Progress toward weekly goals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Weekly Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Baseline Goal</span>
                <span className="text-gray-600 dark:text-gray-400">
                  ${compliance?.weekly.actual?.toFixed(2) || '0.00'} / ${compliance?.weekly.goal?.toFixed(2) || '300.00'}
                </span>
              </div>
              <Progress 
                value={Math.min((compliance?.weekly.actual || 0) / (compliance?.weekly.goal || 300) * 100, 100)} 
                className="h-2"
              />
            </div>

            {/* Stretch Goal */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Stretch Goal</span>
                <span className="text-gray-600 dark:text-gray-400">
                  ${compliance?.weekly.actual?.toFixed(2) || '0.00'} / ${compliance?.weekly.stretchGoal?.toFixed(2) || '750.00'}
                </span>
              </div>
              <Progress 
                value={Math.min((compliance?.weekly.actual || 0) / (compliance?.weekly.stretchGoal || 750) * 100, 100)} 
                className="h-2"
              />
            </div>

            {/* Weekly Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-black dark:text-white">{compliance?.weekly.totalTrades || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Trades</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-black dark:text-white">{compliance?.weekly.winRate || '0'}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
              </div>
            </div>

            {/* Paycheck Status */}
            <div className="text-center">
              {(compliance?.weekly.actual || 0) >= (compliance?.weekly.goal || 300) ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Paycheck Achieved!
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  <DollarSign className="h-4 w-4 mr-1" />
                  ${((compliance?.weekly.goal || 300) - (compliance?.weekly.actual || 0)).toFixed(2)} to Goal
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RULE ONE Status */}
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-black dark:text-white">RULE ONE Compliance</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            One spread at a time per ticker - No stray legs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-black dark:text-white">{compliance?.activeTrades || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Trades</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${compliance?.strayLegs > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {compliance?.strayLegs || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Stray Legs</div>
            </div>
            <div className="text-center">
              {compliance?.strayLegs > 0 ? (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                  <XCircle className="h-4 w-4 mr-1" />
                  Violation
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Compliant
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rule Violations */}
      {violations && violations.length > 0 && (
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-black dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Rule Violations ({violations.length})
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Recent violations requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {violations.map((violation) => (
              <div key={violation.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getSeverityColor(violation.severity)}>
                        {violation.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {violation.ruleReference}
                      </span>
                    </div>
                    <p className="text-black dark:text-white mb-2">{violation.description}</p>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div>Detected: {violation.detectedValue}</div>
                      <div>Allowed: {violation.allowedValue}</div>
                      <div>Time: {new Date(violation.detectedAt).toLocaleString()}</div>
                    </div>
                  </div>
                  {!violation.userAcknowledged && (
                    <Button
                      data-testid={`acknowledge-${violation.id}`}
                      size="sm"
                      onClick={() => acknowledgeViolation(violation.id)}
                      disabled={acknowledging === violation.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {acknowledging === violation.id ? 'Acknowledging...' : 'Acknowledge'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
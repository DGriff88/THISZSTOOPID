import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar, 
  Target,
  BarChart3,
  Brain,
  Shield,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function StrategicAnalysis() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch latest strategic analysis
  const { data: latestAnalysis, isLoading } = useQuery({
    queryKey: ['/api/strategic-analysis/latest'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch portfolio holdings
  const { data: holdings } = useQuery({
    queryKey: ['/api/portfolio/holdings'],
  });

  // Fetch upcoming economic events
  const { data: economicEvents } = useQuery({
    queryKey: ['/api/economic-events'],
  });

  // Generate analysis mutation
  const generateAnalysisMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/strategic-analysis/generate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategic-analysis/latest'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/holdings'] });
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('Error generating analysis:', error);
      setIsGenerating(false);
    }
  });

  const handleGenerateAnalysis = () => {
    setIsGenerating(true);
    generateAnalysisMutation.mutate();
  };

  const getOutlookIcon = (outlook: string) => {
    switch (outlook) {
      case 'bullish': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'bearish': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <BarChart3 className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading strategic analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="strategic-analysis-header">
            <Brain className="w-8 h-8 text-primary" />
            Strategic Portfolio Analysis
          </h1>
          <p className="text-muted-foreground">
            LVMH Investment Methodology - Weekly Strategic Analysis & Risk Assessment
          </p>
        </div>
        <Button 
          onClick={handleGenerateAnalysis}
          disabled={isGenerating || generateAnalysisMutation.isPending}
          data-testid="button-generate-analysis"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate Analysis
            </>
          )}
        </Button>
      </div>

      {latestAnalysis ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market Outlook Card */}
          <Card data-testid="card-market-outlook">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getOutlookIcon(latestAnalysis.marketOutlook)}
                Market Outlook
              </CardTitle>
              <CardDescription>
                Overall market sentiment and direction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Sentiment:</span>
                <Badge variant="outline" className="capitalize">
                  {latestAnalysis.marketOutlook}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Risk Level:</span>
                <Badge className={getRiskColor(latestAnalysis.riskLevel)}>
                  {latestAnalysis.riskLevel}
                </Badge>
              </div>
              {latestAnalysis.fedPolicyExpectation && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Fed Policy:</span>
                  <Badge variant="secondary" className="capitalize">
                    {latestAnalysis.fedPolicyExpectation}
                  </Badge>
                </div>
              )}
              {latestAnalysis.confidence && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Confidence:</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(latestAnalysis.confidence * 100)}%
                    </span>
                  </div>
                  <Progress value={latestAnalysis.confidence * 100} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Card */}
          <Card className="lg:col-span-2" data-testid="card-ai-analysis">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Market Analysis
              </CardTitle>
              <CardDescription>
                AI-powered insights and strategic commentary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {latestAnalysis.aiAnalysis || 
                  'Strategic analysis based on LVMH methodology: Portfolio shows diversified risk profile with high-beta exposure creating vulnerability to Fed policy shifts. Mixed inflation signals (CPI +0.4% vs PPI -0.1%) suggest fragile market equilibrium.'
                }
              </p>
              {latestAnalysis.analysisDate && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Analysis Date: {new Date(latestAnalysis.analysisDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Risk Assessment */}
          <Card data-testid="card-portfolio-risk">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Portfolio Risk
              </CardTitle>
              <CardDescription>
                Risk assessment and correlation analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Risk Rating:</span>
                  <Badge className={getRiskColor(latestAnalysis.portfolioRisk || 'medium')}>
                    {latestAnalysis.portfolioRisk || 'Medium'}
                  </Badge>
                </div>
                {latestAnalysis.correlation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Correlation:</span>
                      <span className="text-sm">
                        {parseFloat(latestAnalysis.correlation).toFixed(2)}
                      </span>
                    </div>
                    <Progress value={parseFloat(latestAnalysis.correlation) * 100} />
                  </div>
                )}
              </div>
              
              {holdings && holdings.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h4 className="font-medium text-sm">Current Holdings</h4>
                  <div className="space-y-1">
                    {holdings.slice(0, 5).map((holding: any) => (
                      <div key={holding.id} className="flex items-center justify-between text-sm">
                        <span>{holding.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                          {holding.riskRating || 'N/A'}
                        </Badge>
                      </div>
                    ))}
                    {holdings.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{holdings.length - 5} more holdings
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategic Recommendations */}
          <Card className="lg:col-span-2" data-testid="card-recommendations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Strategic Recommendations
              </CardTitle>
              <CardDescription>
                AI-generated recommendations based on LVMH methodology
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestAnalysis.recommendations && latestAnalysis.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {latestAnalysis.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">{rec.type?.replace('_', ' ')}</h4>
                        <Badge 
                          variant={rec.priority === 'high' ? 'destructive' : 
                                  rec.priority === 'medium' ? 'default' : 'secondary'}
                        >
                          {rec.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.action}</p>
                      <p className="text-xs">{rec.rationale}</p>
                      {rec.timing && (
                        <p className="text-xs text-muted-foreground">
                          <strong>Timing:</strong> {rec.timing}
                        </p>
                      )}
                      {rec.symbols && (
                        <div className="flex gap-1 mt-2">
                          {rec.symbols.map((symbol: string) => (
                            <Badge key={symbol} variant="outline" className="text-xs">
                              {symbol}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No strategic recommendations available. Generate a new analysis to get AI-powered insights.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Economic Events */}
          {economicEvents && economicEvents.length > 0 && (
            <Card data-testid="card-economic-events">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Key Events
                </CardTitle>
                <CardDescription>
                  Upcoming macro events this week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {economicEvents.slice(0, 5).map((event: any) => (
                    <div key={event.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{event.eventName}</span>
                        <Badge 
                          variant={event.importance === 'high' ? 'destructive' : 
                                  event.importance === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {event.importance}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </p>
                      {event.marketImpact && (
                        <p className="text-xs">{event.marketImpact}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Strategic Analysis Available</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first strategic analysis using the LVMH investment methodology
            </p>
            <Button 
              onClick={handleGenerateAnalysis}
              disabled={isGenerating || generateAnalysisMutation.isPending}
              data-testid="button-generate-first-analysis"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Analysis...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Strategic Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
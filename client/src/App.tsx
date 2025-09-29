import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Strategies from "@/pages/strategies";
import LiveTrading from "@/pages/live-trading";
import PaperTrading from "@/pages/paper-trading";
import TradeHistory from "@/pages/trade-history";
import Analytics from "@/pages/analytics";
import RiskManagement from "@/pages/risk-management";
import Settings from "@/pages/settings";
import AIInsights from "@/pages/AIInsights";
import TradingCompliance from "@/pages/TradingCompliance";
import StrategicAnalysis from "@/pages/StrategicAnalysis";
import TradingStrategies from "@/pages/TradingStrategies";
import { AnimatedIconDemo } from "@/components/AnimatedIconDemo";
import Sidebar from "@/components/layout/sidebar";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/strategies" component={Strategies} />
          <Route path="/live-trading" component={LiveTrading} />
          <Route path="/paper-trading" component={PaperTrading} />
          <Route path="/trade-history" component={TradeHistory} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/ai-insights" component={AIInsights} />
          <Route path="/trading-strategies" component={TradingStrategies} />
          <Route path="/strategic-analysis" component={StrategicAnalysis} />
          <Route path="/trading-compliance" component={TradingCompliance} />
          <Route path="/risk-management" component={RiskManagement} />
          <Route path="/settings" component={Settings} />
          <Route path="/icon-demo" component={AnimatedIconDemo} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="dark">
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

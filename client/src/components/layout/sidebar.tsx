import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  Settings, 
  Target, 
  Shield, 
  BarChart3, 
  History, 
  FileText, 
  Activity, 
  Bot,
  Brain,
  ShieldCheck
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: TrendingUp },
  { name: "Strategies", href: "/strategies", icon: Target },
  { name: "Live Trading", href: "/live-trading", icon: Activity },
  { name: "Paper Trading", href: "/paper-trading", icon: FileText },
  { name: "Trade History", href: "/trade-history", icon: History },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "AI Insights", href: "/ai-insights", icon: Brain },
  { name: "Trading Compliance", href: "/trading-compliance", icon: ShieldCheck },
  { name: "Risk Management", href: "/risk-management", icon: Shield },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">TradeBotPro</h1>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2" data-testid="sidebar-navigation">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 p-3 rounded-md bg-muted">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">JT</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" data-testid="user-name">John Trader</p>
            <p className="text-xs text-muted-foreground">Pro Account</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

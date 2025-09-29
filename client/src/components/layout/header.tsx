import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StopCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  title: string;
  description: string;
}

export default function Header({ title, description }: HeaderProps) {
  const { data: marketStatus } = useQuery({
    queryKey: ['/api/market/status'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const handleEmergencyStop = async () => {
    try {
      const response = await fetch('/api/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        // Show success toast
        console.log('Emergency stop executed');
      }
    } catch (error) {
      console.error('Error executing emergency stop:', error);
    }
  };

  return (
    <header className="bg-card border-b border-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="page-title">{title}</h2>
          <p className="text-muted-foreground" data-testid="page-description">{description}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full status-active"></div>
            <span className="text-sm font-medium" data-testid="connection-status">
              Real Broker Connected
            </span>
          </div>
          
          {/* Market Status */}
          <Badge 
            variant={(marketStatus as any)?.isOpen ? "default" : "secondary"}
            className="flex items-center space-x-2"
            data-testid="market-status"
          >
            <Clock className="w-3 h-3" />
            <span>{(marketStatus as any)?.isOpen ? "Market Open" : "Market Closed"}</span>
          </Badge>
          
          {/* Emergency Stop */}
          <Button 
            variant="destructive" 
            onClick={handleEmergencyStop}
            data-testid="button-emergency-stop"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Emergency Stop
          </Button>
        </div>
      </div>
    </header>
  );
}

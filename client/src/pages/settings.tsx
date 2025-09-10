import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings as SettingsIcon, 
  User, 
  Key, 
  Bell, 
  Shield, 
  Download, 
  Upload, 
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const userSettingsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  alpacaApiKey: z.string().optional(),
  alpacaApiSecret: z.string().optional(),
  paperTrading: z.boolean(),
});

const tradingPreferencesSchema = z.object({
  defaultPositionSize: z.number().min(1, "Position size must be positive"),
  defaultStopLoss: z.number().min(0).max(50).optional(),
  defaultTakeProfit: z.number().min(0).max(100).optional(),
  maxConcurrentTrades: z.number().min(1).max(50),
  riskPerTrade: z.number().min(0.1).max(10),
  autoStartStrategies: z.boolean(),
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  tradeNotifications: z.boolean(),
  strategyNotifications: z.boolean(),
  errorNotifications: z.boolean(),
  dailyReports: z.boolean(),
  weeklyReports: z.boolean(),
});

type UserSettings = z.infer<typeof userSettingsSchema>;
type TradingPreferences = z.infer<typeof tradingPreferencesSchema>;
type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export default function Settings() {
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user data
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: async () => {
      // For demo purposes, return default user data
      return {
        id: 'demo-user-1',
        username: 'demo',
        alpacaApiKey: process.env.VITE_ALPACA_API_KEY || '',
        alpacaApiSecret: process.env.VITE_ALPACA_API_SECRET || '',
        paperTrading: true,
      };
    },
  });

  // Forms
  const userForm = useForm<UserSettings>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      username: currentUser?.username || '',
      alpacaApiKey: currentUser?.alpacaApiKey || '',
      alpacaApiSecret: currentUser?.alpacaApiSecret || '',
      paperTrading: currentUser?.paperTrading ?? true,
    },
  });

  const tradingForm = useForm<TradingPreferences>({
    resolver: zodResolver(tradingPreferencesSchema),
    defaultValues: {
      defaultPositionSize: 1000,
      defaultStopLoss: 2.0,
      defaultTakeProfit: 4.0,
      maxConcurrentTrades: 10,
      riskPerTrade: 1.0,
      autoStartStrategies: false,
    },
  });

  const notificationForm = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      tradeNotifications: true,
      strategyNotifications: true,
      errorNotifications: true,
      dailyReports: false,
      weeklyReports: false,
    },
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserSettings) => {
      // In a real implementation, this would update user settings
      console.log('Updating user settings:', data);
      return Promise.resolve(data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user settings",
        variant: "destructive",
      });
    },
  });

  const updateTradingPreferencesMutation = useMutation({
    mutationFn: async (data: TradingPreferences) => {
      console.log('Updating trading preferences:', data);
      return Promise.resolve(data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trading preferences updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trading preferences",
        variant: "destructive",
      });
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      console.log('Updating notification settings:', data);
      return Promise.resolve(data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/alpaca/account');
      if (!response.ok) {
        throw new Error('Connection failed');
      }
      return response.json();
    },
    onSuccess: () => {
      setConnectionStatus('connected');
      toast({
        title: "Success",
        description: "Alpaca API connection successful",
      });
    },
    onError: () => {
      setConnectionStatus('failed');
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Alpaca API. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const handleUserSubmit = (data: UserSettings) => {
    updateUserMutation.mutate(data);
  };

  const handleTradingSubmit = (data: TradingPreferences) => {
    updateTradingPreferencesMutation.mutate(data);
  };

  const handleNotificationSubmit = (data: NotificationSettings) => {
    updateNotificationMutation.mutate(data);
  };

  const handleTestConnection = () => {
    setConnectionStatus('unknown');
    testConnectionMutation.mutate();
  };

  const handleExportSettings = () => {
    const settings = {
      user: userForm.getValues(),
      trading: tradingForm.getValues(),
      notifications: notificationForm.getValues(),
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradebot-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        
        if (settings.user) {
          userForm.reset(settings.user);
        }
        if (settings.trading) {
          tradingForm.reset(settings.trading);
        }
        if (settings.notifications) {
          notificationForm.reset(settings.notifications);
        }
        
        toast({
          title: "Success",
          description: "Settings imported successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid settings file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  return (
    <div>
      <Header title="Settings" description="Configure your trading bot preferences" />
      
      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                Settings Management
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleExportSettings}
                  data-testid="button-export-settings"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('import-file')?.click()}
                  data-testid="button-import-settings"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="hidden"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList data-testid="settings-tabs" className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-6">
                    <FormField
                      control={userForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={userForm.control}
                      name="paperTrading"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Paper Trading Mode</FormLabel>
                            <FormDescription>
                              Enable paper trading for all new strategies by default
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-paper-trading"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateUserMutation.isPending}
                      data-testid="button-save-account"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateUserMutation.isPending ? "Saving..." : "Save Account Settings"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Alpaca API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  Alpaca API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...userForm}>
                  <div className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="alpacaApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your Alpaca API key"
                              data-testid="input-api-key"
                            />
                          </FormControl>
                          <FormDescription>
                            Your Alpaca API key for trading operations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={userForm.control}
                      name="alpacaApiSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Secret</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field}
                                type={showApiSecret ? "text" : "password"}
                                placeholder="Enter your Alpaca API secret"
                                data-testid="input-api-secret"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowApiSecret(!showApiSecret)}
                                data-testid="button-toggle-api-secret"
                              >
                                {showApiSecret ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Your Alpaca API secret (keep this secure)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={testConnectionMutation.isPending}
                        data-testid="button-test-connection"
                      >
                        {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                      </Button>
                      
                      {connectionStatus !== 'unknown' && (
                        <Badge 
                          variant={connectionStatus === 'connected' ? "default" : "destructive"}
                          className="flex items-center space-x-1"
                        >
                          {connectionStatus === 'connected' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          <span>{connectionStatus === 'connected' ? 'Connected' : 'Failed'}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trading" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trading Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...tradingForm}>
                  <form onSubmit={tradingForm.handleSubmit(handleTradingSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={tradingForm.control}
                        name="defaultPositionSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Position Size ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid="input-default-position-size"
                              />
                            </FormControl>
                            <FormDescription>
                              Default position size for new strategies
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={tradingForm.control}
                        name="maxConcurrentTrades"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Concurrent Trades</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-max-concurrent-trades"
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum number of simultaneous positions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={tradingForm.control}
                        name="defaultStopLoss"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Stop Loss (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                data-testid="input-default-stop-loss"
                              />
                            </FormControl>
                            <FormDescription>
                              Default stop loss percentage
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={tradingForm.control}
                        name="defaultTakeProfit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Take Profit (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                data-testid="input-default-take-profit"
                              />
                            </FormControl>
                            <FormDescription>
                              Default take profit percentage
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={tradingForm.control}
                        name="riskPerTrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Risk Per Trade (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid="input-risk-per-trade"
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum risk per trade as % of portfolio
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={tradingForm.control}
                      name="autoStartStrategies"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Auto-start Strategies</FormLabel>
                            <FormDescription>
                              Automatically start new strategies after creation
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-auto-start-strategies"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateTradingPreferencesMutation.isPending}
                      data-testid="button-save-trading"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateTradingPreferencesMutation.isPending ? "Saving..." : "Save Trading Preferences"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(handleNotificationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Email Notifications</FormLabel>
                              <FormDescription>
                                Receive notifications via email
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-email-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="tradeNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Trade Notifications</FormLabel>
                              <FormDescription>
                                Get notified when trades are executed
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-trade-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="strategyNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Strategy Notifications</FormLabel>
                              <FormDescription>
                                Get notified about strategy status changes
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-strategy-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="errorNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Error Notifications</FormLabel>
                              <FormDescription>
                                Get notified about system errors
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-error-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="dailyReports"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Daily Reports</FormLabel>
                              <FormDescription>
                                Receive daily performance reports
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-daily-reports"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="weeklyReports"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Weekly Reports</FormLabel>
                              <FormDescription>
                                Receive weekly performance summaries
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-weekly-reports"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateNotificationMutation.isPending}
                      data-testid="button-save-notifications"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateNotificationMutation.isPending ? "Saving..." : "Save Notification Settings"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Security Best Practices</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Never share your API keys with anyone</li>
                    <li>• Use strong, unique passwords for all accounts</li>
                    <li>• Enable two-factor authentication when available</li>
                    <li>• Regularly review your trading activity</li>
                    <li>• Keep your browser and system updated</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">API Key Security</h4>
                      <p className="text-sm text-muted-foreground">
                        Your API keys are stored securely and encrypted
                      </p>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Secure
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Connection Security</h4>
                      <p className="text-sm text-muted-foreground">
                        All connections use HTTPS encryption
                      </p>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Encrypted
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Privacy</h4>
                      <p className="text-sm text-muted-foreground">
                        Your trading data is private and not shared
                      </p>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  </div>
                </div>

                <Card className="border-warning">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <AlertCircle className="w-6 h-6 text-warning" />
                      <div>
                        <h4 className="font-medium text-warning">Security Notice</h4>
                        <p className="text-sm text-muted-foreground">
                          This application handles real financial data. Always ensure you're using 
                          the official application and verify all transactions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

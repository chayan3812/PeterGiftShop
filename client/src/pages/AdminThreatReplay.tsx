import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Play, History, Settings, Shield, Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface ThreatReplayScenario {
  id: string;
  name: string;
  description: string;
  merchantId?: string;
  simulateScore?: number;
  geoLocation?: string;
  transactionAmount?: number;
  fraudType?: string;
  expectedOutcomes: string[];
}

interface ReplayExecution {
  id: string;
  scenarioId: string;
  triggeredAt: string;
  adminTriggered: boolean;
  sourceType: 'manual' | 'scheduled' | 'ai-training';
  scenarioSummary: string;
  impactScore: number;
  fraudSignalsGenerated: number;
  autoResponsesTriggered: number;
  aiAdjustmentsMade: string[];
  executionTime: number;
  status: 'success' | 'failed' | 'partial';
  outcomes: any[];
  learningData: any;
}

interface DefenseLearningUpdate {
  id: string;
  timestamp: string;
  triggerSource: 'replay' | 'live-event';
  adjustmentType: 'threshold' | 'pattern' | 'rule-weight';
  oldValue: any;
  newValue: any;
  confidence: number;
  impactPrediction: string;
  approved: boolean;
  adminReview: boolean;
}

export default function AdminThreatReplay() {
  const [selectedScenario, setSelectedScenario] = useState('');
  const [customParams, setCustomParams] = useState({
    merchantId: '',
    simulateScore: 85,
    geoLocation: '',
    transactionAmount: 100000,
    fraudType: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch scenarios
  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery({
    queryKey: ['/api/threats/replay-scenarios'],
  });

  // Fetch replay history
  const { data: executions = [], isLoading: executionsLoading } = useQuery({
    queryKey: ['/api/threats/replay-history'],
  });

  // Fetch learning updates
  const { data: learningUpdates = [], isLoading: learningLoading } = useQuery({
    queryKey: ['/api/threats/learning-updates'],
  });

  // Fetch replay stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/threats/replay-stats'],
  });

  // Execute replay mutation
  const executeMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await fetch('/api/threats/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error('Failed to execute replay');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Threat Replay Executed',
        description: `Scenario executed with impact score ${data.impactScore}/100`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/threats/replay-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/threats/replay-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/threats/learning-updates'] });
    },
    onError: (error) => {
      toast({
        title: 'Execution Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle learning mutation
  const toggleLearningMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/threats/learning/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('Failed to toggle learning');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Learning Mode Updated',
        description: `Defense learning ${data.learningEnabled ? 'enabled' : 'disabled'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/threats/replay-stats'] });
    },
  });

  const handleExecuteReplay = () => {
    const params: any = {
      scenarioId: selectedScenario,
      ...customParams
    };

    // Remove empty values
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key];
      }
    });

    executeMutation.mutate(params);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'success': 'default',
      'failed': 'destructive',
      'partial': 'secondary'
    } as const;
    
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getSeverityColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Threat Replay Engine</h1>
          <p className="text-muted-foreground">Simulate and learn from past security threats</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Defense Learning</span>
            <Switch
              checked={stats?.learningEnabled || false}
              onCheckedChange={(enabled) => toggleLearningMutation.mutate(enabled)}
              disabled={toggleLearningMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Scenarios</p>
                <p className="text-2xl font-bold">{stats?.totalScenarios || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Executions</p>
                <p className="text-2xl font-bold">{stats?.totalExecutions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Impact</p>
                <p className="text-2xl font-bold">{Math.round(stats?.avgImpactScore || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">AI Adjustments</p>
                <p className="text-2xl font-bold">{stats?.totalLearningUpdates || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="execute" className="space-y-4">
        <TabsList>
          <TabsTrigger value="execute">Execute Replay</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
          <TabsTrigger value="learning">AI Learning</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="execute" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Execute Threat Replay</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scenario">Scenario</Label>
                  <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a scenario" />
                    </SelectTrigger>
                    <SelectContent>
                      {scenarios.map((scenario: ThreatReplayScenario) => (
                        <SelectItem key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchantId">Merchant ID (Optional)</Label>
                  <Input
                    id="merchantId"
                    value={customParams.merchantId}
                    onChange={(e) => setCustomParams({ ...customParams, merchantId: e.target.value })}
                    placeholder="test_merchant_123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="simulateScore">Fraud Score (0-100)</Label>
                  <Input
                    id="simulateScore"
                    type="number"
                    min="0"
                    max="100"
                    value={customParams.simulateScore}
                    onChange={(e) => setCustomParams({ ...customParams, simulateScore: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionAmount">Amount (cents)</Label>
                  <Input
                    id="transactionAmount"
                    type="number"
                    value={customParams.transactionAmount}
                    onChange={(e) => setCustomParams({ ...customParams, transactionAmount: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="geoLocation">Geographic Location</Label>
                  <Input
                    id="geoLocation"
                    value={customParams.geoLocation}
                    onChange={(e) => setCustomParams({ ...customParams, geoLocation: e.target.value })}
                    placeholder="Nigeria, China, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fraudType">Fraud Type</Label>
                  <Input
                    id="fraudType"
                    value={customParams.fraudType}
                    onChange={(e) => setCustomParams({ ...customParams, fraudType: e.target.value })}
                    placeholder="geographic-vpn-combo"
                  />
                </div>
              </div>

              {selectedScenario && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Selected Scenario</h4>
                  {scenarios.find((s: ThreatReplayScenario) => s.id === selectedScenario) && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {scenarios.find((s: ThreatReplayScenario) => s.id === selectedScenario)?.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {scenarios.find((s: ThreatReplayScenario) => s.id === selectedScenario)?.expectedOutcomes.map((outcome: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {outcome}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleExecuteReplay}
                disabled={!selectedScenario || executeMutation.isPending}
                className="w-full"
              >
                {executeMutation.isPending ? 'Executing...' : 'Execute Threat Replay'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Execution History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {executions.map((execution: ReplayExecution) => (
                    <div key={execution.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{execution.scenarioSummary}</h4>
                          {getStatusBadge(execution.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(execution.triggeredAt)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Impact Score</span>
                          <p className="font-medium">{execution.impactScore}/100</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fraud Signals</span>
                          <p className="font-medium">{execution.fraudSignalsGenerated}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Auto Responses</span>
                          <p className="font-medium">{execution.autoResponsesTriggered}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Execution Time</span>
                          <p className="font-medium">{execution.executionTime}ms</p>
                        </div>
                      </div>

                      {execution.aiAdjustmentsMade.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-muted-foreground">AI Adjustments:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {execution.aiAdjustmentsMade.map((adjustment, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {adjustment}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>AI Learning Updates</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {learningUpdates.map((update: DefenseLearningUpdate) => (
                    <div key={update.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium capitalize">{update.adjustmentType} Update</h4>
                          {update.approved ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <Badge variant={update.adminReview ? 'default' : 'secondary'}>
                            {update.triggerSource}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(update.timestamp)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Old Value</span>
                          <p className="font-medium">{JSON.stringify(update.oldValue)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">New Value</span>
                          <p className="font-medium">{JSON.stringify(update.newValue)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Confidence</span>
                          <p className={`font-medium ${getSeverityColor(update.confidence)}`}>
                            {Math.round(update.confidence * 100)}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="text-sm text-muted-foreground">Impact Prediction:</span>
                        <p className="text-sm mt-1">{update.impactPrediction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Available Scenarios</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {scenarios.map((scenario: ThreatReplayScenario) => (
                    <div key={scenario.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{scenario.name}</h4>
                        <Badge variant="outline">{scenario.fraudType}</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        {scenario.simulateScore && (
                          <div>
                            <span className="text-muted-foreground">Score</span>
                            <p className="font-medium">{scenario.simulateScore}/100</p>
                          </div>
                        )}
                        {scenario.geoLocation && (
                          <div>
                            <span className="text-muted-foreground">Location</span>
                            <p className="font-medium">{scenario.geoLocation}</p>
                          </div>
                        )}
                        {scenario.transactionAmount && (
                          <div>
                            <span className="text-muted-foreground">Amount</span>
                            <p className="font-medium">${(scenario.transactionAmount / 100).toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-sm text-muted-foreground">Expected Outcomes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {scenario.expectedOutcomes.map((outcome, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {outcome}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Play, Brain, Database, TrendingUp, Shield, Clock, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ThreatLog {
  id: string;
  timestamp: string;
  eventType: string;
  payload: any;
  originalFraudScore?: number;
  originalGeoRisk?: number;
  originalResponses?: string[];
  source: 'webhook' | 'synthetic' | 'archived';
}

interface ReplayResult {
  id: string;
  threatId: string;
  replayedAt: string;
  originalEvent: any;
  replayOutcome: {
    fraudScore: number;
    geoRisk: number;
    responsesTriggered: string[];
    detectionTime: number;
    processingTime: number;
  };
  comparison: {
    scoreDifference: number;
    missedDetections: string[];
    newDetections: string[];
    responseVariance: number;
  };
  learningOpportunities: string[];
  safeMode: boolean;
  adminTriggered: boolean;
}

interface LearningRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  recommendation: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'threshold' | 'pattern' | 'response' | 'performance';
  createdAt: string;
  appliedAt?: string;
  status: 'pending' | 'applied' | 'rejected';
}

interface TrainingSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  replayResults: string[];
  rulesGenerated: string[];
  rulesApplied: string[];
  improvements: {
    detectionAccuracy: number;
    responseTime: number;
    falsePositiveReduction: number;
    coverageIncrease: number;
  };
  status: 'running' | 'completed' | 'failed';
  adminApproved: boolean;
}

export default function AdminReplayDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filtering and batch operations
  const [selectedThreats, setSelectedThreats] = useState<string[]>([]);
  const [batchCriteria, setBatchCriteria] = useState({
    dateStart: '',
    dateEnd: '',
    scoreMin: '',
    scoreMax: '',
    eventTypes: [] as string[],
    limit: '10'
  });

  // Fetch threat logs
  const { data: threatLogs, isLoading: threatsLoading } = useQuery({
    queryKey: ['/api/replay/threats'],
    refetchInterval: 30000
  });

  // Fetch replay results
  const { data: replayResults, isLoading: resultsLoading } = useQuery({
    queryKey: ['/api/replay/results'],
    refetchInterval: 30000
  });

  // Fetch replay statistics
  const { data: replayStats } = useQuery({
    queryKey: ['/api/replay/stats'],
    refetchInterval: 30000
  });

  // Fetch learning rules
  const { data: learningRules } = useQuery({
    queryKey: ['/api/learning/rules'],
    refetchInterval: 30000
  });

  // Fetch training sessions
  const { data: trainingSessions } = useQuery({
    queryKey: ['/api/learning/sessions'],
    refetchInterval: 30000
  });

  // Fetch learning metrics
  const { data: learningMetrics } = useQuery({
    queryKey: ['/api/learning/metrics'],
    refetchInterval: 30000
  });

  // Replay single threat mutation
  const replayThreatMutation = useMutation({
    mutationFn: async ({ threatId, safeMode }: { threatId: string; safeMode: boolean }) => {
      const response = await fetch(`/api/replay/threat/${threatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ safeMode, adminTriggered: true })
      });
      if (!response.ok) throw new Error('Failed to replay threat');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Threat replayed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/replay/results'] });
      queryClient.invalidateQueries({ queryKey: ['/api/replay/stats'] });
    },
    onError: () => {
      toast({ title: 'Failed to replay threat', variant: 'destructive' });
    }
  });

  // Batch replay mutation
  const batchReplayMutation = useMutation({
    mutationFn: async (criteria: any) => {
      const response = await fetch('/api/replay/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...criteria,
          safeMode: true
        })
      });
      if (!response.ok) throw new Error('Failed to run batch replay');
      return response.json();
    },
    onSuccess: (results) => {
      toast({ title: `Batch replay completed: ${results.length} threats processed` });
      queryClient.invalidateQueries({ queryKey: ['/api/replay/results'] });
      queryClient.invalidateQueries({ queryKey: ['/api/replay/stats'] });
    },
    onError: () => {
      toast({ title: 'Failed to run batch replay', variant: 'destructive' });
    }
  });

  // Training session mutation
  const runTrainingMutation = useMutation({
    mutationFn: async ({ replayIds, autoApply }: { replayIds?: string[]; autoApply: boolean }) => {
      const response = await fetch('/api/learning/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replayIds, autoApply })
      });
      if (!response.ok) throw new Error('Failed to run training session');
      return response.json();
    },
    onSuccess: (session) => {
      toast({ 
        title: 'Training session completed',
        description: `Generated ${session.rulesGenerated.length} learning rules`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/learning/rules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/learning/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/learning/metrics'] });
    },
    onError: () => {
      toast({ title: 'Failed to run training session', variant: 'destructive' });
    }
  });

  // Apply learning rule mutation
  const applyRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await fetch(`/api/learning/rules/${ruleId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error('Failed to apply learning rule');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Learning rule applied successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/learning/rules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/learning/metrics'] });
    },
    onError: () => {
      toast({ title: 'Failed to apply learning rule', variant: 'destructive' });
    }
  });

  const handleBatchReplay = () => {
    const criteria: any = {};
    
    if (batchCriteria.dateStart && batchCriteria.dateEnd) {
      criteria.dateRange = {
        start: batchCriteria.dateStart,
        end: batchCriteria.dateEnd
      };
    }
    
    if (batchCriteria.scoreMin && batchCriteria.scoreMax) {
      criteria.scoreRange = {
        min: parseInt(batchCriteria.scoreMin),
        max: parseInt(batchCriteria.scoreMax)
      };
    }
    
    if (batchCriteria.eventTypes.length > 0) {
      criteria.eventTypes = batchCriteria.eventTypes;
    }
    
    if (batchCriteria.limit) {
      criteria.limit = parseInt(batchCriteria.limit);
    }
    
    batchReplayMutation.mutate(criteria);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-black text-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Threat Replay Dashboard</h1>
          <p className="text-gray-400">Advanced threat simulation and defense learning control center</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => runTrainingMutation.mutate({ autoApply: false })}
            disabled={runTrainingMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            Run Training
          </Button>
        </div>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Total Threats</p>
                <p className="text-2xl font-bold text-white">{replayStats?.totalThreats || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Successful Replays</p>
                <p className="text-2xl font-bold text-white">{replayStats?.successfulReplays || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Learning Rules</p>
                <p className="text-2xl font-bold text-white">{learningMetrics?.rulesGenerated || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-400">Avg Processing Time</p>
                <p className="text-2xl font-bold text-white">
                  {replayStats?.avgProcessingTime ? `${Math.round(replayStats.avgProcessingTime)}ms` : '0ms'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="threats" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-900">
          <TabsTrigger value="threats">Threat Logs</TabsTrigger>
          <TabsTrigger value="replays">Replay Results</TabsTrigger>
          <TabsTrigger value="batch">Batch Operations</TabsTrigger>
          <TabsTrigger value="learning">Learning Rules</TabsTrigger>
          <TabsTrigger value="training">Training Sessions</TabsTrigger>
        </TabsList>

        {/* Threat Logs Tab */}
        <TabsContent value="threats" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Historical Threat Logs</CardTitle>
              <CardDescription className="text-gray-400">
                Available threats for replay and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {threatsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-400 mt-2">Loading threat logs...</p>
                    </div>
                  ) : threatLogs?.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No threat logs available</p>
                    </div>
                  ) : (
                    threatLogs?.map((threat: ThreatLog) => (
                      <div key={threat.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              {threat.eventType}
                            </Badge>
                            <Badge variant="outline" className="text-gray-400 border-gray-400">
                              {threat.source}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">
                            {formatTimestamp(threat.timestamp)}
                          </p>
                          {threat.originalFraudScore && (
                            <p className="text-sm text-gray-300">
                              Original Score: {threat.originalFraudScore}/100
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => replayThreatMutation.mutate({ threatId: threat.id, safeMode: true })}
                          disabled={replayThreatMutation.isPending}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Replay
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Replay Results Tab */}
        <TabsContent value="replays" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Replay Results</CardTitle>
              <CardDescription className="text-gray-400">
                Recent threat replay executions and outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {resultsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-400 mt-2">Loading replay results...</p>
                    </div>
                  ) : replayResults?.length === 0 ? (
                    <div className="text-center py-8">
                      <Play className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No replay results available</p>
                    </div>
                  ) : (
                    replayResults?.map((result: ReplayResult) => (
                      <div key={result.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-green-400 border-green-400">
                              {result.threatId}
                            </Badge>
                            {result.safeMode && (
                              <Badge variant="secondary">Safe Mode</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {formatTimestamp(result.replayedAt)}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-400">Fraud Score</p>
                            <p className="text-lg font-semibold text-white">{result.replayOutcome.fraudScore}/100</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Geo Risk</p>
                            <p className="text-lg font-semibold text-white">{result.replayOutcome.geoRisk}/100</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Responses</p>
                            <p className="text-lg font-semibold text-white">{result.replayOutcome.responsesTriggered.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Processing Time</p>
                            <p className="text-lg font-semibold text-white">{result.replayOutcome.processingTime}ms</p>
                          </div>
                        </div>

                        {result.comparison.scoreDifference !== 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-400">Score Difference</p>
                            <p className={`text-sm font-semibold ${result.comparison.scoreDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {result.comparison.scoreDifference > 0 ? '+' : ''}{result.comparison.scoreDifference}
                            </p>
                          </div>
                        )}

                        {result.learningOpportunities.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Learning Opportunities</p>
                            <div className="space-y-1">
                              {result.learningOpportunities.slice(0, 2).map((opportunity, index) => (
                                <p key={index} className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                                  {opportunity}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Operations Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Batch Replay Operations</CardTitle>
              <CardDescription className="text-gray-400">
                Execute replays on multiple threats with filtering criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Date Range Start</Label>
                  <Input
                    type="datetime-local"
                    value={batchCriteria.dateStart}
                    onChange={(e) => setBatchCriteria(prev => ({ ...prev, dateStart: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Date Range End</Label>
                  <Input
                    type="datetime-local"
                    value={batchCriteria.dateEnd}
                    onChange={(e) => setBatchCriteria(prev => ({ ...prev, dateEnd: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Min Fraud Score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={batchCriteria.scoreMin}
                    onChange={(e) => setBatchCriteria(prev => ({ ...prev, scoreMin: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Max Fraud Score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={batchCriteria.scoreMax}
                    onChange={(e) => setBatchCriteria(prev => ({ ...prev, scoreMax: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Limit</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={batchCriteria.limit}
                    onChange={(e) => setBatchCriteria(prev => ({ ...prev, limit: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="10"
                  />
                </div>
              </div>
              
              <Button
                onClick={handleBatchReplay}
                disabled={batchReplayMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Database className="w-4 h-4 mr-2" />
                {batchReplayMutation.isPending ? 'Running Batch Replay...' : 'Start Batch Replay'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Rules Tab */}
        <TabsContent value="learning" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Defense Learning Rules</CardTitle>
              <CardDescription className="text-gray-400">
                AI-generated rules for improving threat detection and response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {learningRules?.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No learning rules generated yet</p>
                      <Button
                        onClick={() => runTrainingMutation.mutate({ autoApply: false })}
                        disabled={runTrainingMutation.isPending}
                        className="mt-2 bg-blue-600 hover:bg-blue-700"
                      >
                        Generate Rules
                      </Button>
                    </div>
                  ) : (
                    learningRules?.map((rule: LearningRule) => (
                      <div key={rule.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getPriorityColor(rule.priority) as any}>
                              {rule.priority}
                            </Badge>
                            <Badge variant={getStatusColor(rule.status) as any}>
                              {rule.status}
                            </Badge>
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              {rule.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">
                            {Math.round(rule.confidence * 100)}% confidence
                          </p>
                        </div>
                        
                        <h4 className="text-lg font-semibold text-white mb-1">{rule.name}</h4>
                        <p className="text-sm text-gray-300 mb-2">{rule.description}</p>
                        
                        <div className="mb-2">
                          <p className="text-xs text-gray-400">Condition</p>
                          <p className="text-sm font-mono text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                            {rule.condition}
                          </p>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-xs text-gray-400">Recommendation</p>
                          <p className="text-sm text-gray-300">{rule.recommendation}</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            Created: {formatTimestamp(rule.createdAt)}
                          </p>
                          {rule.status === 'pending' && (
                            <Button
                              onClick={() => applyRuleMutation.mutate(rule.id)}
                              disabled={applyRuleMutation.isPending}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Target className="w-3 h-3 mr-1" />
                              Apply Rule
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Sessions Tab */}
        <TabsContent value="training" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Training Sessions</CardTitle>
              <CardDescription className="text-gray-400">
                Defense learning training history and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gray-800 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-6 h-6 text-purple-400" />
                      <div>
                        <p className="text-sm text-gray-400">Detection Improvement</p>
                        <p className="text-xl font-bold text-white">
                          {learningMetrics?.detectionImprovement ? 
                            `+${Math.round(learningMetrics.detectionImprovement * 100)}%` : '0%'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="text-sm text-gray-400">Response Time Improvement</p>
                        <p className="text-xl font-bold text-white">
                          {learningMetrics?.responseTimeImprovement ? 
                            `+${Math.round(learningMetrics.responseTimeImprovement * 100)}%` : '0%'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-6 h-6 text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-400">Total Sessions</p>
                        <p className="text-xl font-bold text-white">{learningMetrics?.totalSessions || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {trainingSessions?.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No training sessions yet</p>
                    </div>
                  ) : (
                    trainingSessions?.map((session: TrainingSession) => (
                      <div key={session.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={session.status === 'completed' ? 'default' : 
                                        session.status === 'running' ? 'secondary' : 'destructive'}>
                            {session.status}
                          </Badge>
                          <p className="text-sm text-gray-400">
                            {formatTimestamp(session.startedAt)}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                          <div>
                            <p className="text-xs text-gray-400">Rules Generated</p>
                            <p className="text-lg font-semibold text-white">{session.rulesGenerated.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Rules Applied</p>
                            <p className="text-lg font-semibold text-white">{session.rulesApplied.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Detection Accuracy</p>
                            <p className="text-lg font-semibold text-green-400">
                              +{Math.round(session.improvements.detectionAccuracy * 100)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Response Time</p>
                            <p className="text-lg font-semibold text-blue-400">
                              +{Math.round(session.improvements.responseTime * 100)}%
                            </p>
                          </div>
                        </div>

                        {session.adminApproved && (
                          <Badge variant="secondary" className="mt-2">
                            Admin Approved
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
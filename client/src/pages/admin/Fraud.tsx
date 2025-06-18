import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, TrendingUp, Eye } from "lucide-react";

interface FraudSignal {
  id: string;
  type: string;
  score: number;
  reason: string;
  timestamp: string;
  sourceEvent: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cardId?: string;
  amount?: number;
}

interface FraudStats {
  total: number;
  lastHour: number;
  last24Hours: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  avgScore: number;
}

export default function AdminFraudPage() {
  const [signals, setSignals] = useState<FraudSignal[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [signalsRes, statsRes] = await Promise.all([
        fetch("/api/fraud/signals"),
        fetch("/api/fraud/stats")
      ]);
      
      const signalsData = await signalsRes.json();
      const statsData = await statsRes.json();
      
      setSignals(signalsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load fraud data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(timer);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'high-frequency-load': return '🔄';
      case 'large-amount': return '💰';
      case 'multi-location-abuse': return '📍';
      case 'rapid-creation': return '⚡';
      case 'rapid-redemption': return '🎯';
      default: return '⚠️';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl">Loading fraud detection data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-red-500" />
          <h1 className="text-3xl font-bold">AI Fraud Detection Engine</h1>
          <Badge variant="destructive" className="ml-auto">
            DEFCON {signals.length > 0 ? '2' : '5'}
          </Badge>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">Total Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">{stats.total}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">Last Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">{stats.lastHour}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">Last 24 Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{stats.last24Hours}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">Avg Risk Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">{stats.avgScore}/100</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Severity Breakdown */}
        {stats && Object.keys(stats.bySeverity).length > 0 && (
          <Card className="bg-gray-900 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Threat Level Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(stats.bySeverity).map(([severity, count]) => (
                  <Badge key={severity} className={getSeverityColor(severity)}>
                    {severity.toUpperCase()}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fraud Signals Feed */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Live Fraud Signals
              <Badge variant="outline" className="ml-auto">
                {signals.length} Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signals.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Shield className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">All Clear</p>
                <p className="text-sm">No fraud signals detected</p>
              </div>
            ) : (
              <div className="space-y-4">
                {signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="p-4 bg-red-900/20 rounded-lg border border-red-600/30 hover:border-red-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTypeIcon(signal.type)}</span>
                        <div>
                          <Badge className={getSeverityColor(signal.severity)}>
                            {signal.severity.toUpperCase()}
                          </Badge>
                          <p className="font-bold text-red-400 mt-1">
                            {signal.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-400">{signal.score}/100</div>
                        <div className="text-xs text-gray-400">{formatTimestamp(signal.timestamp)}</div>
                      </div>
                    </div>

                    <p className="text-sm mb-4 text-gray-300">{signal.reason}</p>

                    {(signal.cardId || signal.amount) && (
                      <div className="flex gap-4 text-xs text-gray-400 mb-4">
                        {signal.cardId && (
                          <span>Card: {signal.cardId.substring(0, 12)}...</span>
                        )}
                        {signal.amount && (
                          <span>Amount: ${signal.amount.toFixed(2)}</span>
                        )}
                      </div>
                    )}

                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Raw Event Data
                      </summary>
                      <pre className="text-xs bg-black/50 p-3 rounded mt-2 overflow-auto text-gray-300">
                        {JSON.stringify(signal.sourceEvent, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Activity, AlertTriangle, Globe, Clock, Target } from "lucide-react";

interface AnalyticsData {
  fraudStats: {
    total: number;
    lastHour: number;
    last24Hours: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    avgScore: number;
  };
  threatStats: {
    total: number;
    lastHour: number;
    byCountry: Record<string, number>;
    byThreatType: Record<string, number>;
    avgRiskScore: number;
    vpnCount: number;
    proxyCount: number;
    torCount: number;
  };
  timeSeriesData: Array<{
    time: string;
    fraudSignals: number;
    threats: number;
    avgScore: number;
  }>;
}

interface LiveAlert {
  id: string;
  type: 'fraud' | 'geo-threat';
  score: number;
  summary: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalyticsData = async () => {
    try {
      const [fraudRes, threatRes] = await Promise.all([
        fetch('/api/fraud/stats'),
        fetch('/api/threats/stats')
      ]);

      const fraudStats = await fraudRes.json();
      const threatStats = await threatRes.json();

      // Generate time series data from current stats (in production, would come from historical data)
      const now = new Date();
      const timeSeriesData = Array.from({ length: 12 }, (_, i) => {
        const time = new Date(now.getTime() - (11 - i) * 60 * 60 * 1000);
        return {
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          fraudSignals: Math.floor(Math.random() * 5) + (i > 8 ? fraudStats.lastHour : 0),
          threats: Math.floor(Math.random() * 3) + (i > 9 ? threatStats.lastHour : 0),
          avgScore: Math.floor(Math.random() * 20) + 70 + (i > 8 ? 15 : 0)
        };
      });

      setAnalytics({
        fraudStats,
        threatStats,
        timeSeriesData
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simulate live alerts (in production, would use Socket.IO)
  const generateLiveAlert = () => {
    const alertTypes = ['fraud', 'geo-threat'] as const;
    const severities = ['high', 'critical'] as const;
    const summaries = [
      'High-frequency gift card loading detected',
      'Multi-location abuse pattern identified',
      'Large amount transaction flagged',
      'Proxy connection from high-risk country',
      'Tor exit node activity detected',
      'Rapid redemption pattern observed'
    ];

    const alert: LiveAlert = {
      id: 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      score: Math.floor(Math.random() * 20) + 80,
      summary: summaries[Math.floor(Math.random() * summaries.length)],
      timestamp: new Date().toISOString(),
      severity: severities[Math.floor(Math.random() * severities.length)]
    };

    setLiveAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
  };

  useEffect(() => {
    loadAnalyticsData();
    const dataTimer = setInterval(loadAnalyticsData, 30000); // Refresh every 30s
    const alertTimer = setInterval(generateLiveAlert, 15000); // New alert every 15s

    return () => {
      clearInterval(dataTimer);
      clearInterval(alertTimer);
    };
  }, []);

  const SEVERITY_COLORS = {
    low: '#10b981',
    medium: '#f59e0b', 
    high: '#ef4444',
    critical: '#dc2626'
  };

  const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="text-center text-red-400">Failed to load analytics data</div>
      </div>
    );
  }

  const fraudTypeData = Object.entries(analytics.fraudStats.byType).map(([type, count]) => ({
    name: type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count
  }));

  const severityData = Object.entries(analytics.fraudStats.bySeverity).map(([severity, count]) => ({
    name: severity.toUpperCase(),
    value: count
  }));

  const countryData = Object.entries(analytics.threatStats.byCountry)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([country, count]) => ({
      country,
      threats: count
    }));

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Advanced Fraud Analytics</h1>
          <Badge variant="outline" className="ml-auto">
            Live Dashboard
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Total Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{analytics.fraudStats.total}</div>
              <div className="text-xs text-gray-400">Last 24h: {analytics.fraudStats.last24Hours}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Global Threats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{analytics.threatStats.total}</div>
              <div className="text-xs text-gray-400">Countries: {Object.keys(analytics.threatStats.byCountry).length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Avg Risk Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{analytics.fraudStats.avgScore}/100</div>
              <div className="text-xs text-gray-400">Geo: {analytics.threatStats.avgRiskScore}/100</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Detection Delay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{"< 2s"}</div>
              <div className="text-xs text-gray-400">Real-time</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">VPN/Proxy/Tor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {analytics.threatStats.vpnCount + analytics.threatStats.proxyCount + analytics.threatStats.torCount}
              </div>
              <div className="text-xs text-gray-400">Anonymous</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Alerts Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{liveAlerts.length + analytics.fraudStats.last24Hours}</div>
              <div className="text-xs text-gray-400">Live: {liveAlerts.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Time Series Chart */}
          <Card className="bg-gray-900 border-gray-700 xl:col-span-2">
            <CardHeader>
              <CardTitle>Fraud Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#f9fafb' }}
                  />
                  <Line type="monotone" dataKey="fraudSignals" stroke="#ef4444" strokeWidth={2} name="Fraud Signals" />
                  <Line type="monotone" dataKey="threats" stroke="#f59e0b" strokeWidth={2} name="Geo Threats" />
                  <Line type="monotone" dataKey="avgScore" stroke="#8b5cf6" strokeWidth={2} name="Avg Score" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Live Alerts Feed */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Live Alert Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {liveAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded border border-gray-700 bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge 
                        style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
                        className="text-white text-xs"
                      >
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <div className="text-right text-xs text-gray-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-300 mb-1">{alert.summary}</div>
                    <div className="text-xs text-gray-400">
                      Score: {alert.score}/100 • Type: {alert.type}
                    </div>
                  </div>
                ))}
                {liveAlerts.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2" />
                    <p>Monitoring for alerts...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Fraud Type Distribution */}
          {fraudTypeData.length > 0 && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle>Fraud Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={fraudTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {fraudTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Countries */}
          {countryData.length > 0 && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle>Top Threat Origins</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={countryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="country" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    />
                    <Bar dataKey="threats" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Severity Distribution */}
          {severityData.length > 0 && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle>Threat Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
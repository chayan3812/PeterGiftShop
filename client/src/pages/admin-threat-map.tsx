import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Shield, AlertTriangle, Eye, Wifi } from "lucide-react";

interface GeoLocation {
  ip: string;
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  riskScore: number;
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
}

interface ThreatLocation {
  id: string;
  ip: string;
  location: GeoLocation;
  timestamp: string;
  threatType: string;
  riskScore: number;
  fraudSignalId: string;
  eventDetails: any;
}

interface ThreatStats {
  total: number;
  lastHour: number;
  byCountry: Record<string, number>;
  byThreatType: Record<string, number>;
  avgRiskScore: number;
  vpnCount: number;
  proxyCount: number;
  torCount: number;
}

export default function AdminThreatMap() {
  const [threats, setThreats] = useState<ThreatLocation[]>([]);
  const [stats, setStats] = useState<ThreatStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [threatsRes, statsRes] = await Promise.all([
        fetch("/api/threats/map"),
        fetch("/api/threats/stats")
      ]);
      
      const threatsData = await threatsRes.json();
      const statsData = await statsRes.json();
      
      setThreats(threatsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load threat map data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) return 'bg-red-600 text-white';
    if (score >= 60) return 'bg-orange-500 text-white';
    if (score >= 40) return 'bg-yellow-500 text-black';
    return 'bg-green-500 text-white';
  };

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'high-frequency-load': return '🔄';
      case 'large-amount': return '💰';
      case 'multi-location-abuse': return '🌍';
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
          <div className="text-xl">Loading global threat map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Globe className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Global Threat Intelligence Map</h1>
          <Badge variant="destructive" className="ml-auto">
            {threats.length} Active Threats
          </Badge>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">Total Threats</CardTitle>
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
                <CardTitle className="text-sm font-medium text-gray-300">Avg Risk Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getRiskColor(stats.avgRiskScore)}`}>
                  {stats.avgRiskScore}/100
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">VPN/Proxy/Tor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">
                  {stats.vpnCount + stats.proxyCount + stats.torCount}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">Countries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  {Object.keys(stats.byCountry).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Country Breakdown */}
        {stats && Object.keys(stats.byCountry).length > 0 && (
          <Card className="bg-gray-900 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Threat Origins by Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(stats.byCountry)
                  .sort(([,a], [,b]) => b - a)
                  .map(([country, count]) => (
                    <Badge key={country} variant="outline" className="text-white border-gray-600">
                      {country}: {count}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Threat Map Feed */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Live Threat Intelligence Feed
              <Badge variant="outline" className="ml-auto">
                {threats.length} Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {threats.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Shield className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">No Active Threats</p>
                <p className="text-sm">Global monitoring active</p>
              </div>
            ) : (
              <div className="space-y-4">
                {threats.map((threat) => (
                  <div
                    key={threat.id}
                    className="p-4 bg-red-900/20 rounded-lg border border-red-600/30 hover:border-red-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getThreatIcon(threat.threatType)}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getRiskBadge(threat.location.riskScore)}>
                              Risk: {threat.location.riskScore}/100
                            </Badge>
                            {threat.location.isVPN && <Badge variant="destructive">VPN</Badge>}
                            {threat.location.isProxy && <Badge variant="destructive">Proxy</Badge>}
                            {threat.location.isTor && <Badge variant="destructive">Tor</Badge>}
                          </div>
                          <p className="font-bold text-red-400">
                            {threat.threatType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">{formatTimestamp(threat.timestamp)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300 mb-4">
                      <div>
                        <span className="text-gray-400">IP:</span>
                        <span className="ml-2 font-mono">{threat.ip}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Country:</span>
                        <span className="ml-2">{threat.location.country}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">City:</span>
                        <span className="ml-2">{threat.location.city}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">ISP:</span>
                        <span className="ml-2">{threat.location.isp}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 mb-4">
                      <div>
                        <span>Coordinates:</span>
                        <span className="ml-2 font-mono">
                          {threat.location.latitude.toFixed(4)}, {threat.location.longitude.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span>Timezone:</span>
                        <span className="ml-2">{threat.location.timezone}</span>
                      </div>
                    </div>

                    {threat.eventDetails && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Event Details
                        </summary>
                        <pre className="text-xs bg-black/50 p-3 rounded mt-2 overflow-auto text-gray-300">
                          {JSON.stringify(threat.eventDetails, null, 2)}
                        </pre>
                      </details>
                    )}
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
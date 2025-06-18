import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, Shield, Clock, FileText, Bell } from "lucide-react";

interface DigestReport {
  id: string;
  title: string;
  period: 'daily' | 'weekly';
  generatedAt: string;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  aiGenerated: boolean;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  actionRequired: boolean;
}

export default function MerchantInbox() {
  const [selectedDigest, setSelectedDigest] = useState<DigestReport | null>(null);

  const { data: latestDigest } = useQuery({
    queryKey: ["/api/digest/latest"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: digestList = [] } = useQuery({
    queryKey: ["/api/digest/list"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: securityAlerts = [] } = useQuery({
    queryKey: ["/api/auto-responder/alerts"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: autoResponderStats } = useQuery({
    queryKey: ["/api/auto-responder/stats"],
    refetchInterval: 30000,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security Inbox</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          AI-powered fraud reports and intelligent security alerts for your merchant account
        </p>
      </div>

      <Tabs defaultValue="digest" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="digest" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Latest Digest
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Digest History
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Security Alerts
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="digest" className="space-y-6">
          {latestDigest ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {latestDigest.title}
                    </CardTitle>
                    <CardDescription>
                      Generated {formatDate(latestDigest.generatedAt)}
                      {latestDigest.aiGenerated && (
                        <Badge variant="secondary" className="ml-2">AI Generated</Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant={latestDigest.period === 'daily' ? 'default' : 'outline'}>
                    {latestDigest.period}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Executive Summary</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {latestDigest.summary}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Key Security Findings</h3>
                  <ul className="space-y-2">
                    {latestDigest.keyFindings.map((finding, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Shield className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">AI Security Recommendations</h3>
                  <ul className="space-y-2">
                    {latestDigest.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">No Digest Available</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      The latest security digest is being generated. Check back shortly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {digestList.length > 0 ? (
            <div className="grid gap-4">
              {digestList.map((digest: DigestReport) => (
                <Card key={digest.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{digest.title}</CardTitle>
                        <CardDescription>
                          {formatDate(digest.generatedAt)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={digest.period === 'daily' ? 'default' : 'outline'}>
                          {digest.period}
                        </Badge>
                        {digest.aiGenerated && (
                          <Badge variant="secondary">AI</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                      {digest.summary}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {digest.keyFindings.length} findings • {digest.recommendations.length} recommendations
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedDigest(digest)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">No Digest History</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Security digests will appear here once generated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {securityAlerts.length > 0 ? (
            <div className="space-y-3">
              {securityAlerts.map((alert: SecurityAlert) => (
                <Card key={alert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)} text-white`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {alert.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Alert
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatDate(alert.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {alert.message}
                        </p>
                        {alert.actionRequired && (
                          <Button size="sm" variant="outline">
                            Review Required Actions
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">No Active Alerts</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      All security alerts have been addressed. Your account is secure.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Auto-Responder Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {autoResponderStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {autoResponderStats.totalRules}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Active Rules</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {autoResponderStats.successfulResponses}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Successful Actions</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {autoResponderStats.blockedIPs}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Blocked IPs</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {autoResponderStats.flaggedMerchants}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Flagged Events</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">Loading performance metrics...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      AI-Powered Protection
                    </h4>
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      Your account is protected by advanced AI algorithms that automatically detect and respond to fraud patterns in real-time.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Proactive Monitoring
                    </h4>
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      Our system continuously monitors transaction patterns and geographic threats to prevent fraud before it impacts your business.
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      Intelligent Reporting
                    </h4>
                    <p className="text-purple-800 dark:text-purple-200 text-sm">
                      Receive automated daily and weekly digest reports with actionable insights tailored to your security needs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Digest Detail Modal */}
      {selectedDigest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedDigest.title}</h2>
                <Button variant="outline" onClick={() => setSelectedDigest(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-gray-700 dark:text-gray-300">{selectedDigest.summary}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Key Findings</h3>
                <ul className="space-y-2">
                  {selectedDigest.keyFindings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Shield className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {selectedDigest.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
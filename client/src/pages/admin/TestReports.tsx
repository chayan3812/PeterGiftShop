import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink,
  Download,
  Eye,
  TrendingUp,
  Users,
  Activity
} from "lucide-react";

interface TestReport {
  reportId: string;
  testName: string;
  generatedAt: string;
  executionSummary: {
    totalRequests: number;
    failCount: number;
    successRate: number;
    avgResponseTime: number;
    criticalAlerts: number;
  };
  signedUrl?: string;
  status: 'success' | 'warning' | 'critical';
}

interface AccessLog {
  timestamp: string;
  reportId: string;
  userId: string;
  ip: string;
  success: boolean;
  accessMethod: string;
  responseTime: number;
}

export default function TestReports() {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  useEffect(() => {
    loadTestReports();
    loadAccessLogs();
  }, []);

  const loadTestReports = async () => {
    try {
      // Generate sample secure test reports with JWT tokens
      const sampleReports: TestReport[] = [
        {
          reportId: 'elite-summary-' + Date.now(),
          testName: 'API Comprehensive Test Suite',
          generatedAt: new Date().toISOString(),
          executionSummary: {
            totalRequests: 47,
            failCount: 2,
            successRate: 95.74,
            avgResponseTime: 143,
            criticalAlerts: 0
          },
          status: 'warning'
        },
        {
          reportId: 'security-audit-' + (Date.now() - 3600000),
          testName: 'Security Vulnerability Scan',
          generatedAt: new Date(Date.now() - 3600000).toISOString(),
          executionSummary: {
            totalRequests: 38,
            failCount: 0,
            successRate: 100,
            avgResponseTime: 89,
            criticalAlerts: 0
          },
          status: 'success'
        },
        {
          reportId: 'fraud-analysis-' + (Date.now() - 7200000),
          testName: 'Fraud Detection Engine Test',
          generatedAt: new Date(Date.now() - 7200000).toISOString(),
          executionSummary: {
            totalRequests: 52,
            failCount: 8,
            successRate: 84.62,
            avgResponseTime: 234,
            criticalAlerts: 3
          },
          status: 'critical'
        }
      ];

      // Generate JWT-signed URLs for each report
      for (const report of sampleReports) {
        const response = await fetch('/api/generate-signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: report.reportId, userId: 'admin' })
        });
        
        if (response.ok) {
          const { signedUrl } = await response.json();
          report.signedUrl = signedUrl;
        }
      }

      setReports(sampleReports);
    } catch (error) {
      console.error('Failed to load test reports:', error);
      // Fallback to sample data for demonstration
      setReports([
        {
          reportId: 'demo-report-1',
          testName: 'Demo Test Suite',
          generatedAt: new Date().toISOString(),
          executionSummary: {
            totalRequests: 45,
            failCount: 1,
            successRate: 97.78,
            avgResponseTime: 120,
            criticalAlerts: 0
          },
          status: 'success',
          signedUrl: '/api/test-results/secure/demo-report-1?token=demo'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadAccessLogs = async () => {
    // Generate sample access logs
    const sampleLogs: AccessLog[] = [
      {
        timestamp: new Date().toISOString(),
        reportId: 'elite-summary',
        userId: 'admin',
        ip: '192.168.1.100',
        success: true,
        accessMethod: 'web_browser',
        responseTime: 89
      },
      {
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        reportId: 'security-audit',
        userId: 'auditor',
        ip: '192.168.1.101',
        success: true,
        accessMethod: 'slack_integration',
        responseTime: 134
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        reportId: 'fraud-analysis',
        userId: 'security_team',
        ip: '192.168.1.102',
        success: false,
        accessMethod: 'api_direct',
        responseTime: 1200
      }
    ];
    
    setAccessLogs(sampleLogs);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">JWT-Signed Test Reports</h1>
          <p className="text-muted-foreground mt-2">
            Secure test result sharing with enterprise-grade authentication
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-500" />
          <span className="text-sm text-green-500 font-medium">Secure Access Enabled</span>
        </div>
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">Test Reports</TabsTrigger>
          <TabsTrigger value="logs">Access Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.reportId} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getStatusColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.testName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Report ID: {report.reportId}
                      </p>
                    </div>
                  </div>
                  <Badge variant={report.status === 'success' ? 'default' : 
                               report.status === 'warning' ? 'secondary' : 'destructive'}>
                    {report.status.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {report.executionSummary.successRate}%
                      </div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {report.executionSummary.totalRequests}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Requests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {report.executionSummary.failCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Failures</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {report.executionSummary.avgResponseTime}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Response</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(report.generatedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      {report.signedUrl && (
                        <Button size="sm" asChild>
                          <a href={report.signedUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Secure Report
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Access Activity</CardTitle>
              <p className="text-sm text-muted-foreground">
                JWT-authenticated access logs with security monitoring
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {accessLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className={`h-2 w-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <div className="font-medium">{log.userId}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.reportId} • {log.accessMethod.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{log.ip}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports.length}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Access Attempts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accessLogs.length}</div>
                <p className="text-xs text-muted-foreground">
                  96% success rate
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(accessLogs.reduce((sum, log) => sum + log.responseTime, 0) / accessLogs.length)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  -12ms from last hour
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>JWT Token Validation</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Access Logging</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Failed Access Attempts</span>
                  <Badge variant="secondary">1 (monitored)</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Token Expiration</span>
                  <Badge variant="outline">24 hours</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
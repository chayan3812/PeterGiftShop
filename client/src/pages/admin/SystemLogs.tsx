import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Search,
  Download,
  RefreshCw
} from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  source: string;
  message: string;
  metadata?: any;
}

export default function SystemLogs() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/logs', filter],
    queryFn: async () => {
      const response = await fetch(`/api/admin/logs?filter=${filter}&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
    refetchInterval: 5000
  });

  const { data: stats = {} } = useQuery({
    queryKey: ['/api/admin/logs/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/logs/stats');
      if (!response.ok) throw new Error('Failed to fetch log stats');
      return response.json();
    },
    refetchInterval: 10000
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      error: 'destructive',
      warn: 'secondary',
      info: 'default',
      debug: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const filteredLogs = logs.filter((log: LogEntry) => 
    search === '' || 
    log.message.toLowerCase().includes(search.toLowerCase()) ||
    log.source.toLowerCase().includes(search.toLowerCase())
  );

  const exportLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">System Logs</h1>
          <p className="text-slate-600 dark:text-slate-400">Monitor system activity and troubleshoot issues</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors || 0}</div>
            <p className="text-xs text-muted-foreground">Critical issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings || 0}</div>
            <p className="text-xs text-muted-foreground">Attention needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.info || 0}</div>
            <p className="text-xs text-muted-foreground">General activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Log Filters</CardTitle>
          <CardDescription>Filter and search through system logs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Errors Only</SelectItem>
                <SelectItem value="warn">Warnings Only</SelectItem>
                <SelectItem value="info">Info Only</SelectItem>
                <SelectItem value="debug">Debug Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
          <CardDescription>Real-time system log entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading logs...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.map((log: LogEntry) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getLevelBadge(log.level)}
                      <span className="text-sm text-muted-foreground">{log.source}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">{log.message}</p>
                    {log.metadata && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View metadata
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No logs found matching your criteria
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
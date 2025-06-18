import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Radio,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WebhookLog {
  id: string;
  type: string;
  created_at: string;
  raw: any;
}

export default function WebhookStream() {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: logs = [], isLoading, refetch } = useQuery<WebhookLog[]>({
    queryKey: ['/api/webhooks/logs'],
    queryFn: () => fetch('/api/webhooks/logs?limit=50').then(res => res.json()),
    refetchInterval: autoRefresh ? 3000 : false, // Refresh every 3 seconds when auto-refresh is on
  });

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'gift_card.created':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'gift_card.updated':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'gift_card_activity.created':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const extractEventSummary = (log: WebhookLog) => {
    const { raw } = log;
    switch (log.type) {
      case 'gift_card.created':
        const giftCard = raw?.data?.object;
        return {
          title: 'Gift Card Created',
          details: [
            `ID: ${giftCard?.id?.slice(0, 16)}...`,
            `Type: ${giftCard?.type}`,
            `State: ${giftCard?.state}`,
            `GAN: ${giftCard?.gan || 'Not assigned'}`
          ]
        };
      case 'gift_card.updated':
        const updatedCard = raw?.data?.object;
        return {
          title: 'Gift Card Updated',
          details: [
            `ID: ${updatedCard?.id?.slice(0, 16)}...`,
            `State: ${updatedCard?.state}`,
            `Balance: ${updatedCard?.balance_money ? `$${updatedCard.balance_money.amount/100}` : 'N/A'}`
          ]
        };
      case 'gift_card_activity.created':
        const activity = raw?.data?.object;
        return {
          title: `Gift Card ${activity?.type}`,
          details: [
            `Activity ID: ${activity?.id?.slice(0, 16)}...`,
            `Gift Card: ${activity?.gift_card_id?.slice(0, 16)}...`,
            `Amount: ${activity?.amount_money ? `$${activity.amount_money.amount/100}` : 'N/A'}`,
            `Location: ${activity?.location_id}`
          ]
        };
      default:
        return {
          title: 'Unknown Event',
          details: [`Type: ${log.type}`]
        };
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Radio className={`w-5 h-5 ${autoRefresh ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
              Live Webhook Stream
            </CardTitle>
            <CardDescription className="text-slate-300">
              Real-time Square webhook events ({logs.length} events)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Radio className="w-4 h-4 mr-2" />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {isLoading && logs.length === 0 ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-slate-700/50 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No webhook events received yet</p>
              <p className="text-slate-500 text-sm">Events will appear here when Square sends webhooks</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {logs.map((log, index) => {
                  const summary = extractEventSummary(log);
                  const isExpanded = expandedLogs.has(log.id);
                  
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-900/70 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={`${getTypeColor(log.type)} text-xs`}>
                              {log.type}
                            </Badge>
                            <h3 className="text-white font-medium">{summary.title}</h3>
                            <span className="text-slate-400 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(log.created_at)}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            {summary.details.map((detail, idx) => (
                              <p key={idx} className="text-slate-300 text-sm">{detail}</p>
                            ))}
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-slate-700"
                              >
                                <h4 className="text-white text-sm font-medium mb-2">Raw Payload:</h4>
                                <pre className="text-xs text-slate-300 bg-slate-800/50 p-3 rounded overflow-x-auto">
                                  {JSON.stringify(log.raw, null, 2)}
                                </pre>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(log.id)}
                          className="ml-2 text-slate-400 hover:text-white"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
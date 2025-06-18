import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Radio, 
  BarChart3, 
  Activity,
  Settings,
  Database,
  Monitor
} from "lucide-react";
import StatsPanel from "@/components/admin/StatsPanel";
import WebhookStream from "@/components/admin/WebhookStream";
import GlowCard from "@/components/ui/GlowCard";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Radio className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Webhook Control Tower</h1>
          <p className="text-slate-300">Real-time Square gift card webhook monitoring and analytics</p>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="stream" className="data-[state=active]:bg-purple-600">
              <Radio className="w-4 h-4 mr-2" />
              Live Stream
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
              <Activity className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <StatsPanel />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <WebhookStream />
            </motion.div>
          </TabsContent>

          {/* Live Stream Tab */}
          <TabsContent value="stream">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <WebhookStream />
            </motion.div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <StatsPanel />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlowCard>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Monitor className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">System Health</h3>
                        <p className="text-slate-300 mb-4">Webhook endpoint status and performance metrics</p>
                        <div className="space-y-2 text-left">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Endpoint Status</span>
                            <span className="text-green-400">Healthy</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Response Time</span>
                            <span className="text-white">{"< 50ms"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Success Rate</span>
                            <span className="text-green-400">100%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </GlowCard>

                <GlowCard>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Database className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Data Flow</h3>
                        <p className="text-slate-300 mb-4">Event processing and storage analytics</p>
                        <div className="space-y-2 text-left">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Events Processed</span>
                            <span className="text-white">Real-time</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Storage</span>
                            <span className="text-blue-400">In-Memory</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Retention</span>
                            <span className="text-white">1000 events</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </GlowCard>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
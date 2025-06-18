import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  CreditCard, 
  Shield, 
  BarChart3, 
  Map, 
  Mail, 
  PlayCircle,
  Target,
  Menu,
  X
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/gift-cards", label: "Gift Cards", icon: CreditCard },
  { path: "/admin/fraud", label: "Fraud Detection", icon: Shield },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/threat-map", label: "Threat Map", icon: Map },
  { path: "/admin/replay-dashboard", label: "Threat Replay", icon: PlayCircle },
  { path: "/admin/threat-replay", label: "Legacy Replay", icon: Target },
  { path: "/admin/merchant-inbox", label: "Merchant Inbox", icon: Mail },
  { path: "/admin/system-logs", label: "System Logs", icon: FileText },
  { path: "/admin/user-management", label: "User Management", icon: Users },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Security Admin
              </h1>
              <Badge variant="outline" className="text-xs">
                Enterprise
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {adminNavItems.find(item => item.path === location)?.label || 'Admin Panel'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Enterprise security management
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="hidden sm:flex">
                Admin Access
              </Badge>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
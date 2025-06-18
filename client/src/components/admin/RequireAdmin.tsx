import { useFusionAuth } from "@fusionauth/react-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { user, isAuthenticated, startLogin } = useFusionAuth();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <LogIn className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Please sign in to access the administration panel.
            </p>
            <Button onClick={startLogin} className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <Shield className="h-4 w-4" />
              <span>Secure Authentication</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has admin role
  const isAdmin = user?.registrations?.[0]?.roles?.includes('admin') || false;
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-red-900 dark:text-red-100">
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Administrator privileges required to access this area.
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Logged in as: {user?.email}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Role: Customer
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <Shield className="h-4 w-4" />
              <span>Enterprise Security Protocol</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useFusionAuth } from "@fusionauth/react-sdk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useFusionAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Check if user has admin role
      const isAdmin = user.registrations?.some(reg => 
        reg.roles?.includes('admin')
      );
      
      if (isAdmin) {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/");
      }
    } else if (!isLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card className="w-96 glass-card border-[hsl(var(--glass-border))]">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Authenticating
            </CardTitle>
            <CardDescription>
              Please wait while we complete your authentication...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-pulse">
              <div className="h-2 bg-[hsl(var(--primary))] rounded w-3/4 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Card className="w-96 glass-card border-[hsl(var(--glass-border))]">
        <CardHeader className="text-center">
          <CardTitle>Authentication Complete</CardTitle>
          <CardDescription>
            Redirecting you to the appropriate dashboard...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
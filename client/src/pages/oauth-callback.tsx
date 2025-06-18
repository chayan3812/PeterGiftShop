import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setLocation('/');
        return;
      }

      if (code) {
        try {
          const response = await fetch('/api/auth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              client_id: import.meta.env.VITE_FUSIONAUTH_CLIENT_ID,
              client_secret: import.meta.env.VITE_FUSIONAUTH_CLIENT_SECRET,
              redirect_uri: `${window.location.origin}/oauth-callback`
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Redirect to admin dashboard or original destination
              const returnUrl = sessionStorage.getItem('auth_return_url') || '/admin/dashboard';
              sessionStorage.removeItem('auth_return_url');
              setLocation(returnUrl);
            } else {
              console.error('Token exchange failed:', data);
              setLocation('/');
            }
          } else {
            console.error('Token exchange failed with status:', response.status);
            setLocation('/');
          }
        } catch (error) {
          console.error('Token exchange error:', error);
          setLocation('/');
        }
      } else {
        console.error('No authorization code received');
        setLocation('/');
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Authenticating...
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Please wait while we complete your authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
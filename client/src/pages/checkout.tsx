import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Gift, CreditCard, AlertCircle } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { issueGiftCard, getSquareStatus } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: squareStatus } = useQuery({
    queryKey: ["/api/square/status"],
    queryFn: getSquareStatus,
  });

  const handleIssue = async () => {
    setLoading(true);
    try {
      const res = await issueGiftCard();
      if (res.success && res.card?.id) {
        toast({
          title: "Gift Card Created!",
          description: "Your gift card has been issued successfully.",
        });
        setTimeout(() => setLocation(`/success?cardId=${res.card.id}`), 1500);
      } else {
        throw new Error(res.error || "Failed to create gift card");
      }
    } catch (error: any) {
      toast({
        title: "Issue Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-lg w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Issue Gift Card</h1>
          <p className="text-slate-300">Create a new digital gift card with Square API</p>
        </motion.div>

        <GlowCard>
          {!squareStatus?.configured && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Square API Not Configured</span>
              </div>
              <p className="text-amber-300 text-sm">
                Square API credentials are required to issue real gift cards. This will show you the API structure.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Digital Gift Card</h2>
              <p className="text-slate-300">
                {squareStatus?.configured 
                  ? "Ready to create your gift card with Square" 
                  : "Demo mode - requires Square credentials for live operation"
                }
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-white font-medium mb-2">Square Environment</h3>
                <p className="text-slate-400 text-sm">
                  Environment: <span className="text-purple-400">{squareStatus?.environment || 'sandbox'}</span>
                </p>
                <p className="text-slate-400 text-sm">
                  Status: <span className={squareStatus?.configured ? 'text-green-400' : 'text-amber-400'}>
                    {squareStatus?.configured ? 'Configured' : 'Not Configured'}
                  </span>
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleIssue}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 text-lg font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                >
                  {loading ? (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Issuing Gift Card...
                    </motion.div>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Issue Gift Card
                    </>
                  )}
                </Button>
              </motion.div>

              <p className="text-slate-400 text-xs text-center">
                {squareStatus?.configured 
                  ? "This will create a real gift card using Square's API"
                  : "This will demonstrate the API call structure (requires Square credentials for live operation)"
                }
              </p>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}

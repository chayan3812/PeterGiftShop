import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CreditCard, AlertCircle } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { checkBalance, getSquareStatus } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function Balance() {
  const [giftCardId, setGiftCardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const { toast } = useToast();

  const { data: squareStatus } = useQuery({
    queryKey: ["/api/square/status"],
    queryFn: getSquareStatus,
  });

  const handleCheck = async () => {
    if (!giftCardId) {
      toast({
        title: "Missing Information",
        description: "Please enter a gift card ID to check balance.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await checkBalance(giftCardId);
      
      if (res.success) {
        setBalance(res.balance);
        const amount = res.balance?.amount ? (res.balance.amount / 100).toFixed(2) : "0.00";
        toast({
          title: "Balance Retrieved",
          description: `Gift card balance: $${amount}`,
        });
      } else {
        throw new Error(res.error || "Failed to check balance");
      }
    } catch (error: any) {
      toast({
        title: "Balance Check Failed",
        description: error.message,
        variant: "destructive",
      });
      setBalance(null);
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
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Check Balance</h1>
          <p className="text-slate-300">Verify your gift card balance with Square API</p>
        </motion.div>

        <GlowCard>
          {!squareStatus?.configured && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Square API Not Configured</span>
              </div>
              <p className="text-amber-300 text-sm">
                Square API credentials are required for real gift card balance checking.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Balance Inquiry</h2>
              <p className="text-slate-300">
                {squareStatus?.configured 
                  ? "Enter your gift card ID to check available balance" 
                  : "Demo mode - requires Square credentials for live operation"
                }
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="giftCardId" className="text-white">Gift Card ID</Label>
                <Input
                  id="giftCardId"
                  type="text"
                  placeholder="Enter gift card ID"
                  value={giftCardId}
                  onChange={(e) => setGiftCardId(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                />
              </div>

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
                  onClick={handleCheck}
                  disabled={loading || !giftCardId}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-4 text-lg font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                >
                  {loading ? (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Checking Balance...
                    </motion.div>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Check Balance
                    </>
                  )}
                </Button>
              </motion.div>

              {balance && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                >
                  <h3 className="text-blue-400 font-medium mb-3">Balance Information</h3>
                  <div className="space-y-2">
                    <p className="text-blue-300 text-lg font-semibold">
                      Available Balance: ${balance.amount ? (balance.amount / 100).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-blue-300 text-sm">
                      Currency: {balance.currency || 'USD'}
                    </p>
                  </div>
                </motion.div>
              )}

              <p className="text-slate-400 text-xs text-center">
                {squareStatus?.configured 
                  ? "This will check the real balance using Square's API"
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
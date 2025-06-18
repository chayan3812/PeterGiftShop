import { motion } from "framer-motion";
import { Gift, Check, Copy, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import GlowCard from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Success() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const cardId = urlParams.get('cardId');
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Gift card ID copied to clipboard.",
      });
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-lg w-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Gift Card Created!</h1>
          <p className="text-slate-300">Your digital gift card has been successfully issued</p>
        </motion.div>

        <GlowCard>
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Square Gift Card</h2>
              <p className="text-slate-300">Your gift card is ready to use</p>
            </div>

            {cardId && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h3 className="text-white font-medium mb-2">Gift Card ID</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-green-400 font-mono text-sm bg-black/30 p-2 rounded break-all">
                      {cardId}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(cardId)}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <h3 className="text-green-400 font-medium mb-2">Success Details</h3>
                  <ul className="text-green-300 text-sm space-y-1">
                    <li>• Gift card created with Square API</li>
                    <li>• Digital card ready for immediate use</li>
                    <li>• Save the ID above for future reference</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => window.location.href = '/balance'}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 text-lg font-semibold"
                >
                  Check Balance
                </Button>
              </motion.div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/checkout'}
                  className="text-white border-slate-600 hover:bg-slate-800"
                >
                  Create Another
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/redeem'}
                  className="text-white border-slate-600 hover:bg-slate-800"
                >
                  Redeem Gift Card
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => window.location.href = '/'}
                className="w-full text-slate-400 hover:text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { CheckCircle, Download, Mail, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Success() {
  const giftCardCode = "GIFT-1234-5678-9012";

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-4xl mx-auto text-center">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6 neon-glow">
            Payment Successful!
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Your digital gift card has been created and sent to the recipient's email address.
          </p>
        </motion.div>

        {/* Gift Card Details */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="glass-card border-[hsl(var(--glass-border))] bg-[hsl(var(--glass))] mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Gift Card Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Gift Card Code
                    </label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 font-mono text-lg">
                      {giftCardCode}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Amount
                    </label>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-lg font-semibold text-[hsl(var(--primary))]">
                      $50.00
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Recipient Email
                  </label>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    recipient@example.com
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Personal Message
                  </label>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    Happy Birthday! Enjoy your special day! 🎉
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Button className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] hover-glow">
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
          <Button variant="outline" className="glass-card border-[hsl(var(--glass-border))]">
            <Mail className="w-4 h-4 mr-2" />
            Resend Email
          </Button>
          <Link href="/">
            <Button variant="ghost">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p className="text-gray-400">
            Need help? Contact our support team at{" "}
            <a href="mailto:support@peterdigitalshop.com" className="text-[hsl(var(--primary))] hover:underline">
              support@peterdigitalshop.com
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import RedeemForm from "@/components/gift-card/redeem-form";

export default function Redeem() {
  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6 neon-glow">Redeem Your Gift Card</h1>
          <p className="text-xl text-gray-300">
            Enter your gift card code below to check balance or redeem
          </p>
        </motion.div>
        
        {/* Redeem Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="glass-card border-[hsl(var(--glass-border))] bg-[hsl(var(--glass))]">
            <CardContent className="p-8">
              <RedeemForm />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

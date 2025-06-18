import { motion } from "framer-motion";
import { Gift, Heart, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GiftCardSelector from "@/components/gift-card/gift-card-selector";
import PurchaseForm from "@/components/gift-card/purchase-form";

export default function GiftCards() {
  const giftCardTypes = [
    {
      name: "Premium Digital Card",
      description: "Perfect for online shopping and digital services",
      priceRange: "$25 - $500",
      icon: Gift,
      gradient: "from-[hsl(var(--primary))]/20 to-[hsl(var(--secondary))]/20",
      accentColor: "text-[hsl(var(--primary))]",
      bgGradient: "from-[hsl(var(--primary))]/30 to-transparent",
    },
    {
      name: "Special Occasion",
      description: "Birthdays, anniversaries, and celebrations",
      priceRange: "$10 - $250",
      icon: Heart,
      gradient: "from-[hsl(var(--secondary))]/20 to-[hsl(var(--accent))]/20",
      accentColor: "text-[hsl(var(--secondary))]",
      bgGradient: "from-[hsl(var(--secondary))]/30 to-transparent",
    },
    {
      name: "Corporate Rewards",
      description: "Perfect for employee recognition and incentives",
      priceRange: "$50 - $1000",
      icon: Star,
      gradient: "from-[hsl(var(--accent))]/20 to-[hsl(var(--primary))]/20",
      accentColor: "text-[hsl(var(--accent))]",
      bgGradient: "from-[hsl(var(--accent))]/30 to-transparent",
    },
  ];

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6 neon-glow">Choose Your Gift Card</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Select from our premium collection of digital gift cards. Perfect for any occasion, 
            delivered instantly to your recipient's inbox.
          </p>
        </motion.div>
        
        {/* Gift Card Types */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {giftCardTypes.map((card, index) => (
            <motion.div
              key={index}
              className="gradient-border hover-glow"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="gradient-border-inner">
                <div className={`h-48 bg-gradient-to-r ${card.gradient} rounded-lg mb-6 flex items-center justify-center relative overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient}`}></div>
                  <card.icon className="w-16 h-16 text-white/80 relative z-10" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{card.name}</h3>
                <p className="text-gray-400 mb-4">{card.description}</p>
                <div className="flex justify-between items-center">
                  <span className={`text-2xl font-bold ${card.accentColor}`}>
                    {card.priceRange}
                  </span>
                  <Button 
                    className={`bg-${card.accentColor.replace('text-', '')}/20 hover:bg-${card.accentColor.replace('text-', '')}/30 transition-colors duration-300`}
                    onClick={() => {
                      const element = document.getElementById('purchase-form');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    Select
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Purchase Form */}
        <motion.div 
          id="purchase-form"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="glass-card border-[hsl(var(--glass-border))] bg-[hsl(var(--glass))] max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Quick Purchase</h3>
              <PurchaseForm />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

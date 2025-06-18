import { motion } from "framer-motion";
import { Link } from "wouter";
import { Gift, ShoppingCart, PlayCircle, ShieldCheck, Zap, Headphones, Smartphone, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const stats = [
    { label: "Cards Delivered", value: "50,000+", color: "text-[hsl(var(--primary))]" },
    { label: "Happy Customers", value: "12,000+", color: "text-[hsl(var(--secondary))]" },
    { label: "Customer Rating", value: "4.9★", color: "text-[hsl(var(--accent))]" },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: "Secure Payments",
      description: "Protected by Square's enterprise-grade security and encryption",
      gradient: "from-[hsl(var(--primary))] to-[hsl(var(--secondary))]",
    },
    {
      icon: Zap,
      title: "Instant Delivery",
      description: "Digital gift cards delivered instantly to any email address",
      gradient: "from-[hsl(var(--secondary))] to-[hsl(var(--accent))]",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Round-the-clock customer support for any questions or issues",
      gradient: "from-[hsl(var(--accent))] to-[hsl(var(--primary))]",
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      description: "Perfectly optimized for all devices and screen sizes",
      gradient: "from-[hsl(var(--primary))] to-[hsl(var(--secondary))]",
    },
    {
      icon: Gift,
      title: "Custom Messages",
      description: "Add personal touches with custom messages and scheduling",
      gradient: "from-[hsl(var(--secondary))] to-[hsl(var(--accent))]",
    },
    {
      icon: Star,
      title: "Easy Redemption",
      description: "Simple redemption process with balance tracking and history",
      gradient: "from-[hsl(var(--accent))] to-[hsl(var(--primary))]",
    },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="pt-20 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-[hsl(var(--primary))]/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[hsl(var(--secondary))]/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }}></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <motion.h1 
              className="text-5xl md:text-7xl font-bold mb-6 neon-glow animate-slide-up"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 }}
            >
              🎁 Peter Digital Shop
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 mb-8 animate-slide-up"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Premium Digital Gift Cards • Instant Delivery • Secure Payments
            </motion.p>
            <motion.p 
              className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto animate-slide-up"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Send the perfect gift instantly with our ultra-premium digital gift cards. 
              Powered by Square's secure payment system for peace of mind.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href="/gift-cards">
                <Button className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] px-8 py-4 text-lg font-semibold hover-glow animate-glow-pulse">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Shop Gift Cards
                </Button>
              </Link>
              <Button variant="outline" className="glass-card px-8 py-4 text-lg font-semibold hover-glow border-[hsl(var(--glass-border))]">
                <PlayCircle className="w-5 h-5 mr-2" />
                See How It Works
              </Button>
            </motion.div>
          </div>
          
          {/* Stats */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {stats.map((stat, index) => (
              <Card key={index} className="glass-card hover-glow border-[hsl(var(--glass-border))] bg-[hsl(var(--glass))]">
                <CardContent className="p-6 text-center">
                  <div className={`text-3xl font-bold mb-2 ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-gray-400">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Why Choose Peter Digital Shop?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the future of gift giving with our premium digital platform
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass-card hover-glow border-[hsl(var(--glass-border))] bg-[hsl(var(--glass))] h-full">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center mb-4`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

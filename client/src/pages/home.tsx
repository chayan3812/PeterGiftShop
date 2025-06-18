import { motion } from "framer-motion";
import { Link } from "wouter";
import { Shield, Lock, Globe, BarChart3, Target, Brain, Zap, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const stats = [
    { label: "Threats Detected", value: "250K+", color: "text-[hsl(var(--primary))]" },
    { label: "Organizations Protected", value: "1,200+", color: "text-[hsl(var(--secondary))]" },
    { label: "Uptime Guarantee", value: "99.9%", color: "text-[hsl(var(--accent))]" },
  ];

  const features = [
    {
      icon: Shield,
      title: "Advanced Threat Detection",
      description: "AI-powered fraud detection with real-time risk assessment and scoring",
      gradient: "from-[hsl(var(--primary))] to-[hsl(var(--secondary))]",
    },
    {
      icon: Globe,
      title: "Global Threat Intelligence",
      description: "Comprehensive geospatial threat mapping and geographic risk analysis",
      gradient: "from-[hsl(var(--secondary))] to-[hsl(var(--accent))]",
    },
    {
      icon: Brain,
      title: "AI-Powered Analytics",
      description: "Machine learning algorithms for predictive threat analysis and prevention",
      gradient: "from-[hsl(var(--accent))] to-[hsl(var(--primary))]",
    },
    {
      icon: Target,
      title: "Threat Replay System",
      description: "Advanced simulation engine for defense learning and threat modeling",
      gradient: "from-[hsl(var(--primary))] to-[hsl(var(--secondary))]",
    },
    {
      icon: Eye,
      title: "Real-Time Monitoring",
      description: "24/7 system monitoring with instant alerting and automated response",
      gradient: "from-[hsl(var(--secondary))] to-[hsl(var(--accent))]",
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Multi-factor authentication with role-based access control and audit logs",
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
              🛡️ Enterprise Security Platform
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 mb-8 animate-slide-up"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Advanced Threat Intelligence • AI-Powered Detection • Real-Time Protection
            </motion.p>
            <motion.p 
              className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto animate-slide-up"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Comprehensive global threat intelligence platform with real-time risk assessment 
              and AI-powered fraud detection for enterprise organizations.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href="/admin">
                <Button className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] px-8 py-4 text-lg font-semibold hover-glow animate-glow-pulse">
                  <Shield className="w-5 h-5 mr-2" />
                  Access Security Dashboard
                </Button>
              </Link>
              <Button variant="outline" className="glass-card px-8 py-4 text-lg font-semibold hover-glow border-[hsl(var(--glass-border))]" onClick={() => scrollToSection('features')}>
                <BarChart3 className="w-5 h-5 mr-2" />
                View Threat Analytics
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Enterprise Security Capabilities</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Advanced threat intelligence and real-time protection for modern organizations
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

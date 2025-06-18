import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Gift, Menu, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Gift Cards", href: "/gift-cards" },
    { name: "Redeem", href: "/redeem" },
    { name: "Admin", href: "/admin" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-[hsl(var(--glass-border))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold neon-glow">Peter Digital Shop</h1>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <span
                  className={`transition-colors duration-300 cursor-pointer ${
                    isActive(item.href)
                      ? "text-[hsl(var(--primary))]"
                      : "hover:text-[hsl(var(--primary))]"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Link href="/redeem">
              <Button className="glass-card px-4 py-2 hover-glow border-[hsl(var(--glass-border))] hidden sm:flex">
                <CreditCard className="w-4 h-4 mr-2" />
                Check Balance
              </Button>
            </Link>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              className="md:hidden glass-card p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass-card border-t border-[hsl(var(--glass-border))]"
          >
            <div className="px-4 py-6 space-y-4">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span
                    className={`block py-2 transition-colors duration-300 cursor-pointer ${
                      isActive(item.href)
                        ? "text-[hsl(var(--primary))]"
                        : "hover:text-[hsl(var(--primary))]"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </span>
                </Link>
              ))}
              <Link href="/redeem">
                <Button 
                  className="w-full glass-card border-[hsl(var(--glass-border))] mt-4"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Check Balance
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

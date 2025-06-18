import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GiftCardSelectorProps {
  onAmountChange: (amount: number) => void;
  selectedAmount: number;
}

export default function GiftCardSelector({ onAmountChange, selectedAmount }: GiftCardSelectorProps) {
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const predefinedAmounts = [25, 50, 100, 250];

  const handleAmountSelect = (amount: number) => {
    onAmountChange(amount);
    setShowCustomInput(false);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onAmountChange(numValue);
    }
  };

  const handleCustomClick = () => {
    setShowCustomInput(true);
    onAmountChange(0);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-3">Select Amount</label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {predefinedAmounts.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant={selectedAmount === amount ? "default" : "outline"}
            className={`glass-card p-4 hover-glow border-2 transition-all duration-300 ${
              selectedAmount === amount
                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20"
                : "border-transparent hover:border-[hsl(var(--primary))]"
            }`}
            onClick={() => handleAmountSelect(amount)}
          >
            ${amount}
          </Button>
        ))}
      </div>
      
      <Button
        type="button"
        variant={showCustomInput ? "default" : "outline"}
        className={`glass-card p-4 hover-glow border-2 transition-all duration-300 w-full ${
          showCustomInput
            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20"
            : "border-transparent hover:border-[hsl(var(--primary))]"
        }`}
        onClick={handleCustomClick}
      >
        Custom Amount
      </Button>
      
      {showCustomInput && (
        <div className="mt-4">
          <input
            type="number"
            placeholder="Enter custom amount"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors duration-300"
            min="1"
            max="10000"
          />
        </div>
      )}
    </div>
  );
}

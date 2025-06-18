import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Search, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const balanceCheckSchema = z.object({
  code: z.string().min(1, "Gift card code is required"),
});

const redeemSchema = z.object({
  code: z.string().min(1, "Gift card code is required"),
  amount: z.string().min(1, "Amount is required"),
});

type BalanceCheckForm = z.infer<typeof balanceCheckSchema>;
type RedeemForm = z.infer<typeof redeemSchema>;

interface GiftCardBalance {
  balance: string;
  originalAmount: string;
  isActive: boolean;
  redemptions: Array<{
    amount: string;
    date: string;
    description: string;
  }>;
}

export default function RedeemForm() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<GiftCardBalance | null>(null);
  const [showRedeemForm, setShowRedeemForm] = useState(false);

  const balanceForm = useForm<BalanceCheckForm>({
    resolver: zodResolver(balanceCheckSchema),
    defaultValues: {
      code: "",
    },
  });

  const redeemForm = useForm<RedeemForm>({
    resolver: zodResolver(redeemSchema),
    defaultValues: {
      code: "",
      amount: "",
    },
  });

  const balanceCheckMutation = useMutation({
    mutationFn: async (data: BalanceCheckForm) => {
      const response = await apiRequest("POST", "/api/gift-cards/check-balance", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setBalance(data);
        setShowRedeemForm(true);
        redeemForm.setValue("code", balanceForm.getValues("code"));
        toast({
          title: "Balance Retrieved",
          description: `Available balance: $${data.balance}`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to check balance",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check balance",
        variant: "destructive",
      });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (data: RedeemForm) => {
      const response = await apiRequest("POST", "/api/gift-cards/redeem", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Redemption Successful",
          description: `Redeemed $${data.redemption.amount}. Remaining balance: $${data.remainingBalance}`,
        });
        // Refresh balance
        balanceCheckMutation.mutate({ code: redeemForm.getValues("code") });
        redeemForm.reset({ code: redeemForm.getValues("code"), amount: "" });
      } else {
        toast({
          title: "Redemption Failed",
          description: data.error || "Failed to redeem gift card",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem gift card",
        variant: "destructive",
      });
    },
  });

  const onCheckBalance = (data: BalanceCheckForm) => {
    balanceCheckMutation.mutate(data);
  };

  const onRedeem = (data: RedeemForm) => {
    redeemMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Balance Check Form */}
      <Form {...balanceForm}>
        <form onSubmit={balanceForm.handleSubmit(onCheckBalance)} className="space-y-6">
          <FormField
            control={balanceForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gift Card Code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="bg-white/5 border border-white/10 text-center text-xl font-mono tracking-wider focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button
            type="submit"
            disabled={balanceCheckMutation.isPending}
            className="w-full glass-card px-6 py-3 hover-glow border-[hsl(var(--glass-border))]"
          >
            <Search className="w-5 h-5 mr-2" />
            {balanceCheckMutation.isPending ? "Checking..." : "Check Balance"}
          </Button>
        </form>
      </Form>

      {/* Balance Display */}
      {balance && (
        <Card className="glass-card border-[hsl(var(--glass-border))] bg-[hsl(var(--glass))]">
          <CardContent className="p-6 text-center">
            <div className="text-sm text-gray-400 mb-2">Available Balance</div>
            <div className="text-3xl font-bold text-[hsl(var(--primary))] mb-2">
              ${balance.balance}
            </div>
            <div className="text-sm text-gray-400">
              Original Amount: ${balance.originalAmount}
            </div>
            {balance.redemptions && balance.redemptions.length > 0 && (
              <div className="mt-4 text-sm text-gray-400">
                Last used: {new Date(balance.redemptions[0].date).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Redeem Form */}
      {showRedeemForm && balance && (
        <Card className="glass-card border-[hsl(var(--glass-border))] bg-[hsl(var(--glass))]">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Redeem Gift Card</h3>
            <Form {...redeemForm}>
              <form onSubmit={redeemForm.handleSubmit(onRedeem)} className="space-y-4">
                <FormField
                  control={redeemForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount to Redeem</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="0.00"
                          className="bg-white/5 border border-white/10 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
                          max={balance.balance}
                          min="0.01"
                          step="0.01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  disabled={redeemMutation.isPending}
                  className="w-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] hover-glow"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {redeemMutation.isPending ? "Processing..." : "Redeem Card"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

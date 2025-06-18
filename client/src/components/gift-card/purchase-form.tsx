import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CreditCard, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import GiftCardSelector from "./gift-card-selector";

const purchaseSchema = z.object({
  amount: z.number().min(1, "Amount must be at least $1").max(10000, "Amount cannot exceed $10,000"),
  recipientEmail: z.string().email("Please enter a valid email address"),
  senderName: z.string().min(1, "Sender name is required"),
  message: z.string().optional(),
  deliveryType: z.enum(["instant", "scheduled"]),
  scheduledDate: z.string().optional(),
});

type PurchaseForm = z.infer<typeof purchaseSchema>;

export default function PurchaseForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState(0);

  const form = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      amount: 0,
      recipientEmail: "",
      senderName: "",
      message: "",
      deliveryType: "instant",
      scheduledDate: "",
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (data: PurchaseForm) => {
      const response = await apiRequest("POST", "/api/gift-cards/purchase", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Gift Card Created!",
        description: "Your gift card has been successfully created and sent.",
      });
      setLocation("/success");
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to create gift card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PurchaseForm) => {
    if (selectedAmount === 0) {
      toast({
        title: "Amount Required",
        description: "Please select or enter a gift card amount.",
        variant: "destructive",
      });
      return;
    }
    
    purchaseMutation.mutate({ ...data, amount: selectedAmount });
  };

  const handleAmountChange = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue("amount", amount);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Amount Selection */}
        <GiftCardSelector 
          onAmountChange={handleAmountChange}
          selectedAmount={selectedAmount}
        />

        {/* Recipient Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="recipientEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="recipient@example.com"
                    className="bg-white/5 border border-white/10 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="senderName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="John Doe"
                    className="bg-white/5 border border-white/10 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Personal Message */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal Message (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="Add a personal touch..."
                  className="bg-white/5 border border-white/10 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery Options */}
        <FormField
          control={form.control}
          name="deliveryType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Options</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="instant" id="instant" className="sr-only" />
                    <Label htmlFor="instant" className="cursor-pointer">
                      <Card className={`glass-card p-4 hover-glow transition-all duration-300 ${
                        field.value === "instant" ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20" : ""
                      }`}>
                        <CardContent className="p-0 text-center">
                          <Zap className="w-5 h-5 text-[hsl(var(--primary))] mb-2 mx-auto" />
                          <div className="font-medium">Instant</div>
                          <div className="text-sm text-gray-400">Delivered now</div>
                        </CardContent>
                      </Card>
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="scheduled" id="scheduled" className="sr-only" />
                    <Label htmlFor="scheduled" className="cursor-pointer">
                      <Card className={`glass-card p-4 hover-glow transition-all duration-300 ${
                        field.value === "scheduled" ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/20" : ""
                      }`}>
                        <CardContent className="p-0 text-center">
                          <Calendar className="w-5 h-5 text-[hsl(var(--secondary))] mb-2 mx-auto" />
                          <div className="font-medium">Scheduled</div>
                          <div className="text-sm text-gray-400">Pick a date</div>
                        </CardContent>
                      </Card>
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Scheduled Date Input */}
        {form.watch("deliveryType") === "scheduled" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Date</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      className="bg-white/5 border border-white/10 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        )}

        {/* Purchase Button */}
        <Button
          type="submit"
          disabled={purchaseMutation.isPending || selectedAmount === 0}
          className="w-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] px-8 py-4 text-lg font-semibold hover-glow animate-glow-pulse"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          {purchaseMutation.isPending ? "Processing..." : `Purchase Gift Card - $${selectedAmount}`}
        </Button>
      </form>
    </Form>
  );
}

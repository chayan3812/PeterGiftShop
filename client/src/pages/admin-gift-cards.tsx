import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CreditCard, 
  Settings, 
  Search, 
  Link, 
  Unlink, 
  Plus,
  Filter,
  FileText
} from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";

interface GiftCard {
  id: string;
  gan: string;
  type: string;
  state: string;
  balanceMoney?: {
    amount: number;
    currency: string;
  };
  createdAt: string;
  customerId?: string;
}

export default function AdminGiftCards() {
  const [issueType, setIssueType] = useState<"DIGITAL" | "PHYSICAL">("DIGITAL");
  const [ganLookup, setGanLookup] = useState("");
  const [nonceLookup, setNonceLookup] = useState("");
  const [linkGiftCardId, setLinkGiftCardId] = useState("");
  const [linkCustomerId, setLinkCustomerId] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    state: "",
    customerId: ""
  });
  
  const { toast } = useToast();

  // Fetch gift card list
  const { data: giftCards, isLoading: isLoadingList, refetch: refetchList } = useQuery({
    queryKey: ['/api/gift-card-admin/list', filters],
    queryFn: () => apiRequest(`/api/gift-card-admin/list?${new URLSearchParams(filters).toString()}`),
  });

  // Issue gift card mutation
  const issueMutation = useMutation({
    mutationFn: (type: "DIGITAL" | "PHYSICAL") => 
      apiRequest('/api/gift-card-admin/issue', {
        method: 'POST',
        body: { type }
      }),
    onSuccess: (data) => {
      toast({
        title: "Gift Card Issued",
        description: `Successfully created ${issueType} gift card`,
      });
      refetchList();
    },
    onError: (error: any) => {
      toast({
        title: "Issue Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // GAN lookup mutation
  const ganMutation = useMutation({
    mutationFn: (gan: string) => 
      apiRequest('/api/gift-card-admin/from-gan', {
        method: 'POST',
        body: { gan }
      }),
    onSuccess: (data) => {
      toast({
        title: "Gift Card Found",
        description: `Retrieved gift card via GAN`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lookup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Nonce lookup mutation
  const nonceMutation = useMutation({
    mutationFn: (nonce: string) => 
      apiRequest('/api/gift-card-admin/from-nonce', {
        method: 'POST',
        body: { nonce }
      }),
    onSuccess: (data) => {
      toast({
        title: "Gift Card Found",
        description: `Retrieved gift card via nonce`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lookup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Link customer mutation
  const linkMutation = useMutation({
    mutationFn: ({ giftCardId, customerId }: { giftCardId: string; customerId: string }) => 
      apiRequest('/api/gift-card-admin/link', {
        method: 'POST',
        body: { giftCardId, customerId }
      }),
    onSuccess: (data) => {
      toast({
        title: "Customer Linked",
        description: `Successfully linked customer to gift card`,
      });
      refetchList();
    },
    onError: (error: any) => {
      toast({
        title: "Link Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Unlink customer mutation
  const unlinkMutation = useMutation({
    mutationFn: ({ giftCardId, customerId }: { giftCardId: string; customerId: string }) => 
      apiRequest('/api/gift-card-admin/unlink', {
        method: 'POST',
        body: { giftCardId, customerId }
      }),
    onSuccess: (data) => {
      toast({
        title: "Customer Unlinked",
        description: `Successfully unlinked customer from gift card`,
      });
      refetchList();
    },
    onError: (error: any) => {
      toast({
        title: "Unlink Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleIssue = () => {
    issueMutation.mutate(issueType);
  };

  const handleGanLookup = () => {
    if (!ganLookup.trim()) return;
    ganMutation.mutate(ganLookup);
  };

  const handleNonceLookup = () => {
    if (!nonceLookup.trim()) return;
    nonceMutation.mutate(nonceLookup);
  };

  const handleLink = () => {
    if (!linkGiftCardId.trim() || !linkCustomerId.trim()) return;
    linkMutation.mutate({ giftCardId: linkGiftCardId, customerId: linkCustomerId });
  };

  const handleUnlink = () => {
    if (!linkGiftCardId.trim() || !linkCustomerId.trim()) return;
    unlinkMutation.mutate({ giftCardId: linkGiftCardId, customerId: linkCustomerId });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Settings className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Gift Card Admin</h1>
          <p className="text-slate-300">Advanced gift card management and control panel</p>
        </motion.div>

        <Tabs defaultValue="issue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border-slate-700">
            <TabsTrigger value="issue" className="data-[state=active]:bg-purple-600">Issue Cards</TabsTrigger>
            <TabsTrigger value="lookup" className="data-[state=active]:bg-purple-600">Lookup Tools</TabsTrigger>
            <TabsTrigger value="customer" className="data-[state=active]:bg-purple-600">Customer Links</TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-purple-600">Card List</TabsTrigger>
          </TabsList>

          {/* Issue Gift Cards */}
          <TabsContent value="issue">
            <GlowCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Plus className="w-5 h-5" />
                  Issue New Gift Card
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Create DIGITAL or PHYSICAL gift cards via Square API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardType" className="text-white">Gift Card Type</Label>
                  <Select value={issueType} onValueChange={(value: "DIGITAL" | "PHYSICAL") => setIssueType(value)}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="DIGITAL">Digital Gift Card</SelectItem>
                      <SelectItem value="PHYSICAL">Physical Gift Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleIssue} 
                  disabled={issueMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {issueMutation.isPending ? "Issuing..." : `Issue ${issueType} Gift Card`}
                </Button>

                {issueMutation.data && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <h3 className="text-green-400 font-medium mb-2">Gift Card Created!</h3>
                    <pre className="text-green-300 text-sm overflow-auto">
                      {JSON.stringify(issueMutation.data, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </GlowCard>
          </TabsContent>

          {/* Lookup Tools */}
          <TabsContent value="lookup">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlowCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Search className="w-5 h-5" />
                    GAN Lookup
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Retrieve gift card by GAN (Gift Account Number)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gan" className="text-white">GAN</Label>
                    <Input
                      id="gan"
                      value={ganLookup}
                      onChange={(e) => setGanLookup(e.target.value)}
                      placeholder="Enter GAN"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleGanLookup} 
                    disabled={ganMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {ganMutation.isPending ? "Looking up..." : "Lookup by GAN"}
                  </Button>

                  {ganMutation.data && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h3 className="text-blue-400 font-medium mb-2">Gift Card Found</h3>
                      <pre className="text-blue-300 text-sm overflow-auto">
                        {JSON.stringify(ganMutation.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </GlowCard>

              <GlowCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="w-5 h-5" />
                    Nonce Lookup
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Retrieve gift card by nonce token
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nonce" className="text-white">Nonce</Label>
                    <Input
                      id="nonce"
                      value={nonceLookup}
                      onChange={(e) => setNonceLookup(e.target.value)}
                      placeholder="Enter nonce token"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleNonceLookup} 
                    disabled={nonceMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    {nonceMutation.isPending ? "Looking up..." : "Lookup by Nonce"}
                  </Button>

                  {nonceMutation.data && (
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                      <h3 className="text-indigo-400 font-medium mb-2">Gift Card Found</h3>
                      <pre className="text-indigo-300 text-sm overflow-auto">
                        {JSON.stringify(nonceMutation.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </GlowCard>
            </div>
          </TabsContent>

          {/* Customer Management */}
          <TabsContent value="customer">
            <GlowCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Link className="w-5 h-5" />
                  Customer Linking
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Link or unlink customers from gift cards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="giftCardId" className="text-white">Gift Card ID</Label>
                    <Input
                      id="giftCardId"
                      value={linkGiftCardId}
                      onChange={(e) => setLinkGiftCardId(e.target.value)}
                      placeholder="Enter gift card ID"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customerId" className="text-white">Customer ID</Label>
                    <Input
                      id="customerId"
                      value={linkCustomerId}
                      onChange={(e) => setLinkCustomerId(e.target.value)}
                      placeholder="Enter customer ID"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={handleLink} 
                    disabled={linkMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    {linkMutation.isPending ? "Linking..." : "Link Customer"}
                  </Button>
                  
                  <Button 
                    onClick={handleUnlink} 
                    disabled={unlinkMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    {unlinkMutation.isPending ? "Unlinking..." : "Unlink Customer"}
                  </Button>
                </div>
              </CardContent>
            </GlowCard>
          </TabsContent>

          {/* Gift Card List */}
          <TabsContent value="list">
            <GlowCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CreditCard className="w-5 h-5" />
                  Gift Card List
                </CardTitle>
                <CardDescription className="text-slate-300">
                  View and filter all gift cards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/30 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-white">Type Filter</Label>
                    <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="DIGITAL">Digital</SelectItem>
                        <SelectItem value="PHYSICAL">Physical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white">State Filter</Label>
                    <Select value={filters.state} onValueChange={(value) => setFilters({...filters, state: value})}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                        <SelectValue placeholder="All states" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="">All States</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white">Customer ID</Label>
                    <Input
                      value={filters.customerId}
                      onChange={(e) => setFilters({...filters, customerId: e.target.value})}
                      placeholder="Filter by customer ID"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Gift Cards Grid */}
                {isLoadingList ? (
                  <div className="text-center text-slate-400 py-8">Loading gift cards...</div>
                ) : giftCards?.giftCards?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {giftCards.giftCards.map((card: GiftCard) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <Badge variant={card.type === 'DIGITAL' ? 'default' : 'secondary'}>
                            {card.type}
                          </Badge>
                          <Badge variant={card.state === 'ACTIVE' ? 'default' : 'destructive'}>
                            {card.state}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-white font-medium">ID: {card.id.slice(0, 8)}...</p>
                          {card.gan && <p className="text-slate-300 text-sm">GAN: {card.gan}</p>}
                          {card.balanceMoney && (
                            <p className="text-green-400 font-medium">
                              Balance: {formatCurrency(card.balanceMoney.amount)}
                            </p>
                          )}
                          {card.customerId && (
                            <p className="text-blue-400 text-sm">Customer: {card.customerId}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    No gift cards found with current filters
                  </div>
                )}
              </CardContent>
            </GlowCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
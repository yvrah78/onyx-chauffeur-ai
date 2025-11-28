import { Layout } from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, MoreHorizontal, Phone, Mail, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function Clients() {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.getClients(),
  });

  const { data: tripsData } = useQuery({
    queryKey: ["trips", selectedClientId],
    queryFn: () => selectedClientId ? api.getTrips({ clientId: selectedClientId }) : Promise.resolve({ trips: [] }),
    enabled: !!selectedClientId,
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: ({ clientId, amount }: { clientId: string; amount: number }) =>
      api.createPaymentLink({ clientId, amount, description: "Service Payment" }),
    onSuccess: (data) => {
      toast.success("Payment link created!");
      if (data.paymentLink) {
        window.open(data.paymentLink, '_blank');
      }
      setPaymentDialogOpen(false);
      setPaymentAmount("");
    },
    onError: () => {
      toast.error("Failed to create payment link");
    },
  });

  const clients = clientsData?.clients || [];
  const trips = tripsData?.trips || [];

  const handleCreatePaymentLink = () => {
    if (!selectedClientId || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    createPaymentLinkMutation.mutate({ clientId: selectedClientId, amount });
  };

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Client Directory</h1>
            <p className="text-muted-foreground mt-1">Manage profiles and RAG memory data.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or phone..." className="pl-9 bg-card border-border" data-testid="input-search" />
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-add-client">Add Client</Button>
          </div>
        </div>

        <div className="grid gap-4">
          {clients.map((client: any) => (
            <div key={client.id} className="glass-panel p-6 rounded-xl flex items-center justify-between hover:bg-white/5 transition-all group" data-testid={`client-card-${client.id}`}>
              <div className="flex items-center gap-6">
                <img src={client.avatar || "https://via.placeholder.com/64"} alt={client.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/10" />
                <div>
                  <h3 className="text-xl font-display font-semibold text-foreground" data-testid={`client-name-${client.id}`}>{client.name}</h3>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {client.phone}</span>
                    {client.email && <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> {client.email}</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Dialog open={paymentDialogOpen && selectedClientId === client.id} onOpenChange={(open) => {
                  setPaymentDialogOpen(open);
                  if (open) setSelectedClientId(client.id);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 gap-2" data-testid={`button-payment-${client.id}`}>
                      <CreditCard className="w-4 h-4" />
                      Send Payment Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border text-foreground">
                    <DialogHeader>
                      <DialogTitle className="font-display">Create Payment Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Amount (USD)</label>
                        <Input 
                          type="number" 
                          placeholder="Enter amount..." 
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="bg-white/5 border-white/10"
                          data-testid="input-payment-amount"
                        />
                      </div>
                      <Button 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleCreatePaymentLink}
                        disabled={createPaymentLinkMutation.isPending}
                        data-testid="button-create-payment-link"
                      >
                        {createPaymentLinkMutation.isPending ? "Creating..." : "Create Payment Link"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-menu-${client.id}`}><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem data-testid={`menu-edit-${client.id}`}>Edit Profile</DropdownMenuItem>
                    <DropdownMenuItem data-testid={`menu-history-${client.id}`}>View Trip History</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" data-testid={`menu-block-${client.id}`}>Block Client</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

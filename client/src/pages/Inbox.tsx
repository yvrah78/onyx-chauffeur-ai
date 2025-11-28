import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Send, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Inbox() {
  const queryClient = useQueryClient();
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.getClients(),
  });

  const clients = clientsData?.clients || [];
  const activeClient = clients.find((c: any) => c.id === activeClientId) || clients[0];

  const { data: messagesData } = useQuery({
    queryKey: ["messages", activeClient?.id],
    queryFn: () => activeClient ? api.getMessages(activeClient.id) : Promise.resolve({ messages: [] }),
    enabled: !!activeClient,
  });

  const { data: clientDetailData } = useQuery({
    queryKey: ["client", activeClient?.id],
    queryFn: () => activeClient ? api.getClient(activeClient.id) : Promise.resolve(null),
    enabled: !!activeClient,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) =>
      api.chat(activeClient.phone, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeClient.id] });
      queryClient.invalidateQueries({ queryKey: ["client", activeClient.id] });
      setMessageInput("");
      toast.success("Message sent");
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const messages = messagesData?.messages || [];
  const ragProfile = clientDetailData?.ragProfile;

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeClient) return;
    sendMessageMutation.mutate(messageInput);
  };

  return (
    <Layout>
      <div className="flex h-screen pt-4 pb-4 pr-4">
        {/* Sidebar List */}
        <div className="w-80 flex flex-col border-r border-white/5 bg-card/30 backdrop-blur-sm rounded-l-2xl overflow-hidden ml-4 my-4">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Messages</h2>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full bg-black/40">
                <TabsTrigger value="all" className="flex-1" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="clients" className="flex-1" data-testid="tab-clients">Clients</TabsTrigger>
                <TabsTrigger value="drivers" className="flex-1" data-testid="tab-drivers">Drivers</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-y-auto">
            {clients.map((client: any) => (
              <div
                key={client.id}
                onClick={() => setActiveClientId(client.id)}
                className={cn(
                  "p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors flex gap-3 items-start",
                  activeClient?.id === client.id ? "bg-white/10 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                )}
                data-testid={`conversation-${client.id}`}
              >
                <img src={client.avatar || "https://via.placeholder.com/64"} className="w-10 h-10 rounded-full object-cover border border-white/10" alt={client.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-medium text-sm text-foreground truncate" data-testid={`client-name-${client.id}`}>{client.name}</h3>
                    <span className="text-[10px] text-muted-foreground">Now</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {activeClient && (
          <div className="flex-1 flex flex-col bg-card/50 backdrop-blur-md rounded-r-2xl border border-white/5 my-4 mr-4 shadow-2xl">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
              <div className="flex items-center gap-3">
                <img src={activeClient.avatar || "https://via.placeholder.com/64"} className="w-8 h-8 rounded-full object-cover" alt={activeClient.name} />
                <div>
                  <h3 className="font-display font-semibold text-foreground" data-testid="active-client-name">{activeClient.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
                    <span className="text-xs text-muted-foreground">SMS Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-foreground transition-all" data-testid="button-view-rag">
                      <Sparkles className="w-3 h-3" />
                      View RAG Profile
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[400px] border-l border-white/10 bg-zinc-950 sm:max-w-[540px]">
                    <SheetHeader className="mb-6">
                      <SheetTitle className="font-display text-2xl text-primary">AI Client Memory</SheetTitle>
                    </SheetHeader>
                    {ragProfile ? (
                      <div className="space-y-6">
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                          <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2"><Info className="w-4 h-4"/> Client Summary</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="rag-summary">
                            {ragProfile.summary || "No summary available"}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-3">Preferences</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {(Array.isArray(ragProfile.preferences) ? ragProfile.preferences : JSON.parse(ragProfile.preferences || "[]")).map((pref: string, i: number) => (
                              <div key={i} className="px-3 py-2 rounded-md bg-white/5 border border-white/5 text-xs text-zinc-300" data-testid={`rag-preference-${i}`}>
                                {pref}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-3">Notes</h4>
                          <ul className="space-y-2">
                            {(Array.isArray(ragProfile.notes) ? ragProfile.notes : JSON.parse(ragProfile.notes || "[]")).map((note: string, i: number) => (
                              <li key={i} className="flex gap-2 text-xs text-muted-foreground" data-testid={`rag-note-${i}`}>
                                <span className="text-primary">•</span> {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading profile...</p>
                    )}
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg: any) => {
                const isBot = msg.senderId === "bot";
                return (
                  <div key={msg.id} className={cn("flex", isBot ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[60%] p-4 rounded-2xl shadow-sm relative group",
                      isBot 
                        ? "bg-primary text-primary-foreground rounded-br-sm" 
                        : "bg-white/10 text-foreground rounded-bl-sm"
                    )} data-testid={`message-${msg.id}`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <span className="text-[10px] opacity-50 mt-2 block text-right">
                        {format(new Date(msg.timestamp), "HH:mm")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-black/20">
              <div className="flex gap-2">
                <Input 
                  placeholder="Type a message or command..." 
                  className="flex-1 bg-white/5 border-white/10 focus-visible:ring-primary/50 text-foreground placeholder:text-muted-foreground/50"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  data-testid="input-message"
                  disabled={sendMessageMutation.isPending}
                />
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !messageInput.trim()}
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

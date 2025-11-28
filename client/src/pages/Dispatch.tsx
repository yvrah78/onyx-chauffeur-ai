import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { MapPin, Clock, User, Car, Check, AlertCircle, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AnimatedList } from "@/components/AnimatedList";
import { motion, AnimatePresence } from "framer-motion";

export default function Dispatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const { data: unassignedData, isLoading: loadingUnassigned } = useQuery({
    queryKey: ["trips", "unassigned"],
    queryFn: () => api.getUnassignedTrips(),
  });

  const { data: driversData } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.getDrivers(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.getClients(),
  });

  const assignMutation = useMutation({
    mutationFn: ({ tripId, driverId }: { tripId: string; driverId: string }) =>
      api.assignDriver(tripId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({
        title: "Driver Assigned",
        description: "Trip has been assigned and synced to calendar.",
      });
      setSelectedTripId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unassignedTrips = unassignedData?.trips || [];
  const drivers = driversData?.drivers || [];
  const clients = clientsData?.clients || [];
  
  const availableDrivers = drivers.filter((d: any) => d.status === "available");
  const clientMap = new Map<string, any>(clients.map((c: any) => [c.id, c]));

  const driverListItems = availableDrivers.map((driver: any) => ({
    id: driver.id,
    content: (
      <div className="flex items-center gap-4">
        <div className="relative">
          {driver.avatar ? (
            <img
              src={driver.avatar}
              alt={driver.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{driver.name}</p>
          <p className="text-xs text-muted-foreground">{driver.phone}</p>
        </div>
        <Car className="w-5 h-5 text-primary/50" />
      </div>
    ),
  }));

  const handleDriverSelect = (item: { id: string }, tripId: string) => {
    assignMutation.mutate({ tripId, driverId: item.id });
  };

  const selectedTrip = unassignedTrips.find((t: any) => t.id === selectedTripId);
  const selectedTripClient = selectedTrip ? clientMap.get(selectedTrip.clientId) : null;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Trip Assignment</h1>
            <p className="text-muted-foreground mt-1">Assign drivers to pending trips and sync to calendar.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-amber-500 font-medium">{unassignedTrips.length} Unassigned</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Car className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500 font-medium">{availableDrivers.length} Available Drivers</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Unassigned Trips Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-amber-500 rounded-full" />
              <h2 className="text-lg font-medium text-foreground">Pending Assignment</h2>
            </div>

            {loadingUnassigned ? (
              <div className="glass-panel p-12 rounded-xl flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : unassignedTrips.length === 0 ? (
              <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center text-center border-dashed border-2 border-muted">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground max-w-sm">
                  All trips have been assigned to drivers. New requests will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {unassignedTrips.map((trip: any) => {
                  const client = clientMap.get(trip.clientId);
                  const isSelected = selectedTripId === trip.id;

                  return (
                    <motion.div
                      key={trip.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "glass-panel rounded-xl transition-all duration-300 cursor-pointer",
                        isSelected 
                          ? "ring-2 ring-primary shadow-lg shadow-primary/20" 
                          : "hover:border-primary/30 hover:shadow-md"
                      )}
                      onClick={() => setSelectedTripId(isSelected ? null : trip.id)}
                      data-testid={`unassigned-trip-${trip.id}`}
                    >
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                          {/* Trip Info */}
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-[80px]">
                                <p className="text-2xl font-display font-bold text-primary">
                                  {format(new Date(trip.pickupTime), "HH:mm")}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase">
                                  {format(new Date(trip.pickupTime), "MMM d")}
                                </p>
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-sm font-medium text-foreground" data-testid={`pickup-${trip.id}`}>
                                    {trip.pickupLocation}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                                  <span className="text-sm text-muted-foreground" data-testid={`dropoff-${trip.id}`}>
                                    {trip.dropoffLocation}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Client:</span>
                                <span className="font-medium text-foreground" data-testid={`client-${trip.id}`}>
                                  {client?.name || "Unknown"}
                                </span>
                              </div>
                              <div className="text-lg font-bold font-display text-foreground" data-testid={`price-${trip.id}`}>
                                ${trip.price}
                              </div>
                            </div>

                            {trip.notes && (
                              <div className="flex items-start gap-2 text-xs bg-amber-500/10 text-amber-400 px-3 py-2 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span>{trip.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Click indicator */}
                          <div className="flex items-center gap-3 border-t lg:border-t-0 lg:border-l border-white/5 pt-4 lg:pt-0 lg:pl-6">
                            <div className={cn(
                              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200",
                              isSelected 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            )}>
                              <Car className="w-4 h-4" />
                              <span>{isSelected ? "Select Driver Below" : "Click to Assign"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Animated Driver List */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-white/10 p-4 bg-black/20">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Car className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium text-foreground">Available Drivers</span>
                                  <span className="text-xs text-muted-foreground">({availableDrivers.length})</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTripId(null);
                                  }}
                                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                  data-testid="close-driver-list"
                                >
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </div>
                              
                              {availableDrivers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No available drivers at the moment</p>
                                </div>
                              ) : (
                                <AnimatedList
                                  items={driverListItems}
                                  onItemSelect={(item) => handleDriverSelect(item, trip.id)}
                                  showGradients={availableDrivers.length > 3}
                                  enableArrowNavigation={true}
                                  className="bg-card/50 rounded-lg"
                                />
                              )}
                              
                              {assignMutation.isPending && (
                                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
                                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                                  <span>Assigning driver...</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drivers Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h2 className="text-lg font-medium text-foreground">Driver Fleet</h2>
            </div>

            <div className="glass-panel rounded-xl divide-y divide-white/5">
              {drivers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No drivers registered
                </div>
              ) : (
                drivers.map((driver: any) => (
                  <div
                    key={driver.id}
                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                    data-testid={`driver-card-${driver.id}`}
                  >
                    <div className="relative">
                      {driver.avatar ? (
                        <img
                          src={driver.avatar}
                          alt={driver.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                          driver.status === "available" ? "bg-emerald-500" :
                          driver.status === "busy" ? "bg-amber-500" : "bg-zinc-500"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate" data-testid={`driver-name-${driver.id}`}>
                        {driver.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{driver.phone}</p>
                    </div>
                    <div
                      className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider",
                        driver.status === "available" 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : driver.status === "busy"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                      )}
                      data-testid={`driver-status-${driver.id}`}
                    >
                      {driver.status}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calendar Sync Info */}
            <div className="glass-panel p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-sm">Calendar Sync</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned trips are automatically synced to Google Calendar. Drivers can subscribe from their phones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

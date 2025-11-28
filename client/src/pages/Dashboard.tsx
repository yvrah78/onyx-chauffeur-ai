import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { format, addDays, isSameDay } from "date-fns";
import { MapPin, Clock, DollarSign, CheckCircle2, Circle, XCircle, Car, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);

  const { data: tripsData } = useQuery({
    queryKey: ["trips"],
    queryFn: () => api.getTrips(),
  });

  const { data: statsData } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.getStats(),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.getClients(),
  });

  const { data: driversData } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.getDrivers(),
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  
  const trips = tripsData?.trips || [];
  const stats = statsData || { activeTrips: 0, pendingTrips: 0, todayRevenue: 0 };
  const clients = clientsData?.clients || [];
  const drivers = driversData?.drivers || [];

  const dailyTrips = trips.filter((t: any) => isSameDay(new Date(t.pickupTime), selectedDate));

  // Create lookup maps
  const clientMap = new Map(clients.map((c: any) => [c.id, c]));
  const driverMap = new Map(drivers.map((d: any) => [d.id, d]));

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Dispatch Board</h1>
            <p className="text-muted-foreground mt-1">Manage fleet schedules and assignments.</p>
          </div>
          <Dialog open={isNewTripOpen} onOpenChange={setIsNewTripOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(212,175,55,0.2)] border-none" data-testid="button-new-reservation">
                <Plus className="w-4 h-4 mr-2" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="font-display">Create New Reservation</DialogTitle>
              </DialogHeader>
              <div className="py-8 text-center text-muted-foreground">
                <p>AI Agent handles bookings via SMS, or use manual entry form here.</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Active Trips", value: stats.activeTrips?.toString() || "0", sub: "Currently in progress", icon: Car },
            { label: "Pending Requests", value: stats.pendingTrips?.toString() || "0", sub: "Requires confirmation", icon: Clock },
            { label: "Revenue (Today)", value: `$${stats.todayRevenue || 0}`, sub: "+12% vs last week", icon: DollarSign },
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className="glass-panel p-6 rounded-xl flex items-start justify-between hover:bg-white/5 transition-colors cursor-pointer animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${idx * 100}ms` }}
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                <h3 className="text-2xl font-display font-bold text-foreground" data-testid={`value-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>{stat.value}</h3>
                <p className="text-xs text-emerald-500 mt-1 font-medium">{stat.sub}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
          {weekDays.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[80px] h-20 rounded-xl border transition-all duration-200",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                data-testid={`button-date-${format(date, 'yyyy-MM-dd')}`}
              >
                <span className="text-xs font-medium uppercase tracking-wider mb-1">{format(date, "EEE")}</span>
                <span className="text-xl font-bold font-display">{format(date, "d")}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 animate-in fade-in duration-500">
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full"/>
            Schedule for {format(selectedDate, "MMMM do, yyyy")}
          </h2>

          {dailyTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 glass-panel rounded-xl border-dashed border-2 border-muted">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Car className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No trips scheduled for this day.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {dailyTrips.map((trip: any) => (
                <TripCard key={trip.id} trip={trip} client={clientMap.get(trip.clientId)} driver={driverMap.get(trip.driverId)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function TripCard({ trip, client, driver }: { trip: any; client?: any; driver?: any }) {
  const statusColors: Record<string, string> = {
    scheduled: "text-blue-400 border-blue-400/20 bg-blue-400/10",
    "in-progress": "text-amber-400 border-amber-400/20 bg-amber-400/10",
    completed: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
    cancelled: "text-red-400 border-red-400/20 bg-red-400/10",
  };

  const statusIcons: Record<string, any> = {
    scheduled: Circle,
    "in-progress": Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
  };

  const StatusIcon = statusIcons[trip.status] || Circle;

  return (
    <div className="glass-panel p-6 rounded-xl hover:border-primary/30 transition-all duration-300 group" data-testid={`card-trip-${trip.id}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        <div className="flex items-start md:items-center gap-6 min-w-[200px]">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-foreground" data-testid={`time-${trip.id}`}>{format(new Date(trip.pickupTime), "HH:mm")}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pickup</p>
          </div>
          <div className={cn("px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-2", statusColors[trip.status])} data-testid={`status-${trip.id}`}>
            <StatusIcon className="w-3 h-3" />
            <span className="uppercase tracking-wider">{trip.status.replace("-", " ")}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
            <span className="text-sm font-medium text-foreground" data-testid={`pickup-${trip.id}`}>{trip.pickupLocation}</span>
          </div>
          <div className="w-0.5 h-4 bg-border ml-[3px]" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid={`dropoff-${trip.id}`}>{trip.dropoffLocation}</span>
          </div>
        </div>

        <div className="flex items-center gap-8 border-l border-white/5 pl-8">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Client</p>
            <div className="flex items-center gap-2">
              {client?.avatar && <img src={client.avatar} alt={client.name} className="w-6 h-6 rounded-full" />}
              <span className="text-sm font-medium text-foreground" data-testid={`client-name-${trip.id}`}>{client?.name || "Unknown"}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Driver</p>
            <div className="flex items-center gap-2">
               {driver ? (
                  <>
                    {driver.avatar && <img src={driver.avatar} alt={driver.name} className="w-6 h-6 rounded-full" />}
                    <span className="text-sm font-medium text-foreground" data-testid={`driver-name-${trip.id}`}>{driver.name}</span>
                  </>
               ) : (
                 <span className="text-sm text-amber-500 italic" data-testid={`driver-name-${trip.id}`}>Unassigned</span>
               )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-display text-foreground" data-testid={`price-${trip.id}`}>${trip.price}</p>
            <p className={cn("text-[10px] uppercase tracking-wider", trip.paymentStatus === 'paid' ? "text-emerald-500" : "text-amber-500")} data-testid={`payment-status-${trip.id}`}>
              {trip.paymentStatus}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

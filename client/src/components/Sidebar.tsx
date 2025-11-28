import { Link, useLocation } from "wouter";
import { LayoutDashboard, Car, MessageSquare, Users, Settings, LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Car, label: "Dispatch", path: "/dispatch" },
  { icon: MessageSquare, label: "Inbox", path: "/inbox" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-700 flex items-center justify-center shadow-lg shadow-primary/20">
           <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-xl tracking-tight text-foreground">ONYX<span className="text-primary">.AI</span></span>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-primary font-medium shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                  )}
                />
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <span className="font-display font-bold text-xs text-zinc-400">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">Dispatcher</p>
          </div>
          <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </div>
      </div>
    </div>
  );
}

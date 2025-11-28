import { Sidebar } from "./Sidebar";
import bgTexture from "@assets/generated_images/subtle_dark_luxury_texture_background.png";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden">
      {/* Subtle Background Texture */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url(${bgTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <Sidebar />
      
      <main className="flex-1 ml-64 relative z-10 h-screen overflow-y-auto bg-background/50 backdrop-blur-[2px]">
        {children}
      </main>
    </div>
  );
}

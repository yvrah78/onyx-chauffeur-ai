import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Settings() {
  return (
    <Layout>
       <div className="p-8 max-w-4xl mx-auto space-y-8">
         <div>
            <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your AI dispatcher and billing.</p>
          </div>

          <div className="space-y-8">
            <section className="glass-panel p-6 rounded-xl space-y-6">
              <h2 className="text-xl font-display font-semibold text-primary">Automation</h2>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Auto-Reply to SMS</Label>
                  <p className="text-sm text-muted-foreground">AI will automatically respond to scheduling queries.</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Driver Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send SMS alerts to drivers when assigned.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </section>

            <section className="glass-panel p-6 rounded-xl space-y-6">
              <h2 className="text-xl font-display font-semibold text-primary">Integrations</h2>
              
              <div className="flex items-center justify-between p-4 border border-white/5 rounded-lg bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#635BFF] rounded-md flex items-center justify-center text-white font-bold">S</div>
                  <div>
                    <p className="font-medium text-foreground">Stripe</p>
                    <p className="text-xs text-emerald-500">Connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-white/10">Configure</Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-white/5 rounded-lg bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#F22F46] rounded-md flex items-center justify-center text-white font-bold">T</div>
                  <div>
                    <p className="font-medium text-foreground">Twilio</p>
                    <p className="text-xs text-emerald-500">Connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-white/10">Configure</Button>
              </div>
            </section>
          </div>
       </div>
    </Layout>
  );
}

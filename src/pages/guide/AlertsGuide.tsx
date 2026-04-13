import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Bell, AlertOctagon, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const AlertsGuide = () => {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase">Aurora Energy</span>
          </Link>
          <Link to="/documentation">
            <Button variant="ghost" className="text-sm font-bold text-slate-400 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Help Center
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="badge-premium mb-6 inline-block">User Guide</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient leading-none">
              Alerts & <br /> Notifications.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Never be surprised by a high bill. Set up custom thresholds to receive immediate pings if your consumption spikes unexpectedly.
            </p>
          </motion.div>

          <div className="space-y-16">
            <section>
              <div className="flex items-center gap-4 mb-8 text-primary">
                <Bell className="h-8 w-8" />
                <h2 className="text-3xl font-black tracking-tight text-white uppercase">Setting Thresholds</h2>
              </div>
              <p className="text-lg leading-relaxed text-slate-400 mb-8">
                Navigate to your account settings to define your maximum daily or monthly kW allocation. If your smart meter detects that you are trending past this budget, it will trigger an automated alert.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                 <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 relative">
                    <AlertOctagon className="h-8 w-8 text-rose-500 absolute top-6 right-6 opacity-20" />
                    <h4 className="font-bold text-white mb-2">Usage Spikes</h4>
                    <p className="text-sm text-slate-400">Triggered if your wattage jumps over 3000W instantly, potentially indicating a heavy appliance was left on.</p>
                 </div>
                 <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 relative">
                    <Zap className="h-8 w-8 text-amber-500 absolute top-6 right-6 opacity-20" />
                    <h4 className="font-bold text-white mb-2">Budget Warnings</h4>
                    <p className="text-sm text-slate-400">Sent when you have consumed 80% of your requested monthly token allocation.</p>
                 </div>
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-white mb-4">Delivery Methods</h3>
              <p className="text-lg leading-relaxed text-slate-400 mb-6">
                Alerts can be delivered natively within the dashboard, sent to your registered email, or texted directly to your phone via SMS for immediate offline warnings.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AlertsGuide;

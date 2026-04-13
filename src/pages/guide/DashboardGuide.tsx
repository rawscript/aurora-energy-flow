import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Activity, Home, BatteryCharging, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const DashboardGuide = () => {
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
              Understanding <br /> Your Dashboard.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Learn how to interpret your real-time telemetry, track historical consumption, and master the core features of the Aurora Energy platform.
            </p>
          </motion.div>

          <div className="space-y-16">
            <section>
              <div className="flex items-center gap-4 mb-8 text-primary">
                <Activity className="h-8 w-8" />
                <h2 className="text-3xl font-black tracking-tight text-white uppercase">Real-Time Metrics</h2>
              </div>
              <p className="text-lg leading-relaxed text-slate-400 mb-8">
                The top cards on your dashboard display live readings from your connected smart meter. These update every few seconds to reflect your current load.
              </p>
              
              {/* UI Explainer Mockup */}
              <div className="p-8 rounded-3xl bg-slate-900 border border-white/5 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap className="w-32 h-32" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                    {[
                      { label: "Voltage", val: "230V", icon: Zap, color: "text-blue-400" },
                      { label: "Current", val: "2.4A", icon: Activity, color: "text-emerald-400" },
                      { label: "Active Power", val: "552W", icon: BatteryCharging, color: "text-amber-400" },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <stat.icon className={`h-6 w-6 mb-3 ${stat.color}`} />
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
                        <div className="text-3xl font-black text-white">{stat.val}</div>
                      </div>
                    ))}
                 </div>
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-bold tracking-tight text-white mb-4">Historical Charts</h3>
              <p className="text-lg leading-relaxed text-slate-400 mb-6">
                The main graph visualizes your power draft over the last 24 hours. Spikes generally correspond to heavy appliances like water heaters or stoves. By identifying recurring spikes, you can shift usage to off-peak hours to save money.
              </p>
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                 <div className="p-3 bg-primary/20 rounded-full text-primary shrink-0">
                    <ChevronRight className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="font-bold text-white text-lg mb-1">Pro Tip</h4>
                    <p className="text-sm text-slate-400">Hover your cursor (or tap on mobile) directly over the chart line to see the exact wattage pulled at any specific minute during the day.</p>
                 </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DashboardGuide;

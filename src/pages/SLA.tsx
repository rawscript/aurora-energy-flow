import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Activity, Clock, Shield, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const SLA = () => {
  const systems = [
    { name: "Core Telemetry Hub", status: "Operational", uptime: "99.99%", load: "Low" },
    { name: "AI Forecasting Engine", status: "Operational", uptime: "99.95%", load: "Normal" },
    { name: "Unified Telemetry Mesh", status: "Operational", uptime: "99.99%", load: "Stable" },
    { name: "API Gateway", status: "Operational", uptime: "100%", load: "Low" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase">Aurora Energy</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-sm font-bold text-slate-400 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
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
            <div className="badge-premium mb-6 inline-block">System Status</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient leading-none">
              SLA & <br /> Availability.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Real-time monitoring of our grid infrastructure and auxiliary services. We maintain a 99.9% uptime commitment.
            </p>
          </motion.div>

          {/* Current Status */}
          <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                   <div className="w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-white">All Systems Operational</h3>
                   <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">No issues detected in the last 24 hours</p>
                </div>
             </div>
             <Button variant="outline" className="border-white/10 text-white gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh Status
             </Button>
          </div>

          <div className="grid gap-6">
             {systems.map((sys, i) => (
                <motion.div
                   key={sys.name}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: i * 0.1 }}
                   className="glass-card p-8 flex items-center justify-between"
                >
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                         <Activity className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                         <h4 className="text-lg font-bold text-white">{sys.name}</h4>
                         <span className="text-xs text-slate-500 font-medium">Global Cluster Region: Kenya-East-1</span>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                         <CheckCircle2 className="h-4 w-4" />
                         <span>{sys.status}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{sys.uptime} Uptime</div>
                   </div>
                </motion.div>
             ))}
          </div>

          <div className="mt-20 grid md:grid-cols-2 gap-8">
             <div className="p-10 rounded-3xl bg-slate-900 border border-white/5">
                <Shield className="h-10 w-10 text-primary mb-6" />
                <h3 className="text-xl font-bold text-white mb-4">Uptime Commitment</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                   Our Service Level Agreement (SLA) guarantees 99.9% monthly uptime. If we fall below this threshold, enterprise customers are eligible for service credits.
                </p>
             </div>
             <div className="p-10 rounded-3xl bg-slate-900 border border-white/5">
                <AlertCircle className="h-10 w-10 text-primary mb-6" />
                <h3 className="text-xl font-bold text-white mb-4">Incident Reporting</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                   Status updates are posted every 15 minutes during active incidents. Subscribe to our infrastructure mailing list for real-time alerts.
                </p>
             </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SLA;

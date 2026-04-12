import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Layers, Server, ArrowLeft, Database, Shield, Activity, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const SystemArchitecture = () => {
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
          <Link to="/documentation">
            <Button variant="ghost" className="text-sm font-bold text-slate-400 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Docs
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
            <div className="badge-premium mb-6 inline-block">Architecture Overview</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient leading-none">
              System <br /> Architecture.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Explore the distributed infrastructure that enables real-time analytics across millions of edge devices with military-grade security.
            </p>
          </motion.div>

          <div className="space-y-20">
             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Server className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Cloud Ingress Layer</h2>
                </div>
                <div className="prose prose-invert max-w-none text-slate-400">
                   <p className="text-lg font-medium leading-relaxed">
                      Utilizing a globally distributed data ingress layer, Aurora ensures high availability even during regional network instability. Our legacy-compatible telemetry gateway optimizes data transmission for low-bandwidth environments without revealing network topology.
                   </p>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Activity className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">AI Processing Pipeline</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="p-8 rounded-3xl bg-white/5 border border-white/5">
                      <h4 className="text-xl font-bold text-white mb-4">Anomaly Detection</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">
                         Tensorflow-based models analyze incoming data streams to identify unauthorized consumption and equipment fatigue in real-time.
                      </p>
                   </div>
                   <div className="p-8 rounded-3xl bg-white/5 border border-white/5">
                      <h4 className="text-xl font-bold text-white mb-4">Predictive Analytics</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">
                         Recurrent Neural Networks (RNN) process historical usage to generate highly accurate billing forecasts for Kenyan households.
                      </p>
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Shield className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Infrastructure Security</h2>
                </div>
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                   Each architectural layer is isolated via private VPCs, with cross-layer communication strictly governed by mTLS and automated security group policies.
                </p>
             </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SystemArchitecture;

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Lock, Cpu, Globe, ArrowLeft, FileText, Server, Key, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const Whitepaper = () => {
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
          <Link to="/privacy">
            <Button variant="ghost" className="text-sm font-bold text-slate-400 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Privacy
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
            <div className="badge-premium mb-6 inline-block">Technical Whitepaper</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient leading-none">
              Security <br /> Architecture.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              A deep dive into the encryption, telemetry protocols, and data isolation strategies powering Aurora's smart meter infrastructure.
            </p>
          </motion.div>

          {/* Table of Contents / Summary */}
          <div className="glass-card p-10 mb-16 bg-gradient-to-br from-primary/5 to-transparent">
             <h3 className="text-2xl font-black mb-6 text-white flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" /> Executive Summary
             </h3>
             <p className="text-slate-300 leading-relaxed mb-8">
                The Aurora platform utilizes a zero-trust architecture designed specifically for the unique challenges of the Kenyan energy market. By combining AES-256 encryption at the edge with isolated cloud VPCs, we ensure that energy consumption data remains the property of the consumer.
             </p>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                   { label: "Encryption", val: "AES-256" },
                   { label: "Protocol", val: "MQTTS" },
                   { label: "Isolation", val: "Multi-tenant" },
                   { label: "Auth", val: "JWT/OAuth2" }
                ].map((stat) => (
                   <div key={stat.label} className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 block mb-1">{stat.label}</span>
                      <span className="text-sm font-black text-white uppercase">{stat.val}</span>
                   </div>
                ))}
             </div>
          </div>

          {/* Sections */}
          <div className="space-y-20">
             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Lock className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">End-to-Edge Encryption</h2>
                </div>
                <div className="prose prose-invert max-w-none text-slate-400">
                   <p className="text-lg leading-relaxed mb-6">
                      Data is encrypted at the source using hardware-accelerated AES-256. The encryption keys are generated within the Secure Element (SE) of the smart meter gateway, ensuring that raw telemetry data is never exposed in transit.
                   </p>
                   <ul className="space-y-4 list-none p-0">
                      {[
                         "Diffie-Hellman key exchange for secure handshake",
                         "Automatic rotating session keys every 24 hours",
                         "Hardware-level TLS 1.3 implementation"
                      ].map((item, i) => (
                         <li key={i} className="flex gap-3 items-start">
                            <Zap className="h-5 w-5 text-primary shrink-0 mt-1" />
                            <span>{item}</span>
                         </li>
                      ))}
                   </ul>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Server className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Cloud Data Isolation</h2>
                </div>
                <div className="prose prose-invert max-w-none text-slate-400">
                   <p className="text-lg leading-relaxed mb-6">
                      Our multi-tenant architecture uses Row-Level Security (RLS) and logical database isolation to ensure one customer's data can never be accessed by another, even within the same infrastructure cluster.
                   </p>
                   <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                         <h4 className="font-bold text-white mb-2">Stateless API Layers</h4>
                         <p className="text-sm">API requests are authenticated via short-lived JWTs with granular scope permissions.</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                         <h4 className="font-bold text-white mb-2">Isolated VPCs</h4>
                         <p className="text-sm">Production data lives in a private subnet with no direct internet access.</p>
                      </div>
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Key className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Access Control</h2>
                </div>
                <div className="p-10 rounded-3xl bg-slate-900 border border-white/5 text-center">
                   <Activity className="h-12 w-12 text-primary mx-auto mb-6" />
                   <h3 className="text-xl font-bold text-white mb-4">Continuous Monitoring</h3>
                   <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                      All administrative access is logged, audited, and requires Multi-Factor Authentication (MFA). Our Security Operations Center (SOC) monitors for anomaly detection 24/7.
                   </p>
                </div>
             </section>
          </div>

          <div className="mt-20 pt-16 border-t border-white/5 flex flex-col items-center">
             <Button className="premium-button h-16 px-10 text-lg">
                Download PDF Version (v2.4)
             </Button>
             <p className="mt-4 text-xs text-slate-500">Last updated: April 2026</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Whitepaper;

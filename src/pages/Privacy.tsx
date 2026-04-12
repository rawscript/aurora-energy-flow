import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Lock, Eye, FileText, Globe, CheckCircle2, ArrowLeft, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Privacy = () => {
  const policies = [
    {
      title: "Data Sovereignty",
      icon: Globe,
      content: "All telemetry data originating from Kenyan smart meters is processed and stored in compliance with the Data Protection Act (2019). We prioritize local data residency where possible.",
      color: "text-blue-400"
    },
    {
      title: "End-to-End Encryption",
      icon: Lock,
      content: "Military-grade AES-256 encryption secures data from the hardware gateway to our cloud infrastructure. Your energy consumption patterns remain private and inaccessible to third parties.",
      color: "text-emerald-400"
    },
    {
      title: "Zero-Knowledge Analytics",
      icon: Eye,
      content: "Our AI forecast engine operates on anonymized data sets. We generate insights without ever linking sensitive personal identifiers to specific usage spikes.",
      color: "text-purple-400"
    },
    {
      title: "Audit & Compliance",
      icon: FileText,
      content: "Regular security audits and SOC2 Type II compliance ensure that our infrastructure meets the highest global standards for data integrity and availability.",
      color: "text-amber-400"
    }
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
            <div className="badge-premium mb-6 inline-block">Security First</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient">
              Privacy Infrastructure.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              How we protect Kenya's energy data through transparent security protocols and robust encryption standards.
            </p>
          </motion.div>

          <div className="grid gap-8">
            <div className="lg:col-span-2 glass-card p-10 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Shield className="h-40 w-40 text-primary" />
               </div>
               <div className="relative z-10">
                  <h3 className="text-3xl font-black mb-4 text-white">Our Privacy Commitment</h3>
                  <p className="text-lg text-slate-300 mb-6 leading-relaxed">
                    At Aurora, privacy isn't a feature—it's the foundation. We believe that every Kenyan citizen has the right to secure, private energy management without surveilled consumption.
                  </p>
                  <div className="flex flex-wrap gap-4">
                     {["DPA 2019 Compliant", "AES-256 Encrypted", "SOC2 Readiness", "ISO 27001"].map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest leading-none">
                           {tag}
                        </span>
                     ))}
                  </div>
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
               {policies.map((policy, i) => (
                 <motion.div
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.5, delay: i * 0.1 }}
                   className="glass-card p-8 group hover:border-primary/20 transition-all"
                 >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 mb-6 group-hover:bg-primary/5 transition-colors">
                       <policy.icon className={`h-6 w-6 ${policy.color}`} />
                    </div>
                    <h4 className="text-xl font-black mb-3 tracking-tight text-white">{policy.title}</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{policy.content}</p>
                 </motion.div>
               ))}
            </div>
          </div>

          <div className="mt-20 flex flex-col items-center text-center">
             <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Key className="h-10 w-10 text-primary" />
             </div>
             <h3 className="text-2xl font-black mb-4 text-white">Trust is our currency.</h3>
             <p className="text-slate-400 max-w-xl mb-8 font-medium">
                Our infrastructure is built on the principles of transparency and security. Feel free to review our technical protocols.
             </p>
             <div className="flex gap-4">
                <Button className="h-14 px-8 premium-button font-bold">
                   Security Whitepaper
                </Button>
                <Button variant="outline" className="h-14 px-8 border-white/10 hover:bg-white/5 text-white font-bold">
                   Compliance Audit
                </Button>
             </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5 opacity-50 text-center">
         <p className="text-xs font-medium text-slate-600">
            © {new Date().getFullYear()} Aurora Smart Meter Solutions. Security Policy v3.0
         </p>
      </footer>
    </div>
  );
};

export default Privacy;

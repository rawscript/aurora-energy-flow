import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Database, Table, ArrowLeft, Shield, Lock, Activity, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const DataSchemas = () => {
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
            <div className="badge-premium mb-6 inline-block">Data Engineering</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient leading-none">
              Data <br /> Schemas.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Technical specifications for our energy data models, multi-tenant isolation schemas, and the metadata architecture powering our AI engine.
            </p>
          </motion.div>

          <div className="space-y-16">
             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Table className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Data Integrity</h2>
                </div>
                <div className="prose prose-invert max-w-none text-slate-400">
                   <p className="text-lg leading-relaxed mb-6">
                      Aurora maintains strict data integrity protocols to ensure that energy telemetry is accurate, immutable, and verifiable. Our data warehouse architecture is designed for high-availability and extreme durability.
                   </p>
                   <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-8 rounded-2xl bg-white/5 border border-white/5">
                         <h4 className="font-bold text-white mb-2">Immutable Audit Logs</h4>
                         <p className="text-sm">Every data point ingestion is timestamped and cryptographically signed at the source.</p>
                      </div>
                      <div className="p-8 rounded-2xl bg-white/5 border border-white/5">
                         <h4 className="font-bold text-white mb-2">Periodic Validation</h4>
                         <p className="text-sm">Automated reconciliation between edge meter readings and cloud dashboard state.</p>
                      </div>
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Shield className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Privacy & Isolation</h2>
                </div>
                <div className="prose prose-invert max-w-none text-slate-400">
                   <p className="text-lg leading-relaxed mb-6">
                      User data isolation is a core pillar of the Aurora platform. We utilize advanced multi-tenant virtualization techniques to ensure that sensitive consumption patterns are strictly siloed.
                   </p>
                   <div className="p-10 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-8">
                      <div className="flex-1">
                         <h3 className="text-xl font-black text-white mb-2">Corporate Data Policy</h3>
                         <p className="text-sm text-slate-400">Detailed schema architectures and internal database policies are proprietary information available only to certified compliance auditors.</p>
                      </div>
                      <Link to="/privacy/compliance">
                         <Button variant="link" className="text-primary font-bold p-0">View Compliance Overview</Button>
                      </Link>
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Layers className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Indexing Strategy</h2>
                </div>
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                   We utilize proprietary high-velocity indexing for time-series data, ensuring that even with billions of records, query performance for real-time dashboards remains optimal.
                </p>
             </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DataSchemas;

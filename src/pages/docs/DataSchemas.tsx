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
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Consumption Schema</h2>
                </div>
                <div className="glass-card p-0 overflow-hidden border-white/10">
                   <div className="bg-white/5 p-4 border-b border-white/10 grid grid-cols-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span>Field Name</span>
                      <span>Type / Description</span>
                   </div>
                   {[
                      { field: "meter_id", val: "UUID (Primary Key)" },
                      { field: "reading_kwh", val: "DECIMAL (Current meter value)" },
                      { field: "load_rate", val: "FLOAT (Instantaneous power draw)" },
                      { field: "captured_at", val: "TIMESTAMP (UTC)" }
                   ].map((item) => (
                      <div key={item.field} className="p-4 border-b border-white/5 grid grid-cols-2 text-sm">
                         <code className="text-primary">{item.field}</code>
                         <span className="text-slate-400">{item.val}</span>
                      </div>
                   ))}
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Shield className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Tenant Isolation</h2>
                </div>
                <div className="prose prose-invert max-w-none text-slate-400">
                   <p className="text-lg leading-relaxed mb-6">
                      Data isolation is enforced at the database level using Row-Level Security (RLS). Every query is scoped to the `org_id` context of the authenticated user.
                   </p>
                   <div className="bg-black p-6 rounded-2xl border border-white/5 font-mono text-sm">
                      <p className="text-blue-400">CREATE POLICY</p> 
                      <p className="text-white">tenant_isolation_policy ON telemetry</p>
                      <p className="text-blue-400">USING</p> 
                      <p className="text-white">(org_id = current_setting('app.org_id'));</p>
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Layers className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Indexing Strategy</h2>
                </div>
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                   We utilize hyper-table partitioning for time-series data, ensuring that even with billions of records, query performance for real-time dashboards remains optimal.
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

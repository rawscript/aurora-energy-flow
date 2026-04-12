import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Terminal, Code, ArrowLeft, Key, Database, Cpu, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const ApiReference = () => {
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
            <div className="badge-premium mb-6 inline-block">Technical Reference</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient leading-none">
              API Reference.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Integrate real-time energy telemetry into your own applications using our high-performance REST and GraphQL interfaces.
            </p>
          </motion.div>

          <div className="space-y-16">
             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Key className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Authentication</h2>
                </div>
                <div className="glass-card p-8 bg-slate-900/50">
                   <p className="text-slate-400 mb-6 leading-relaxed">
                      All API requests require a Bearer Token. You can generate production API keys from your dashboard's Developer Settings.
                   </p>
                   <div className="p-4 rounded-xl bg-black border border-white/5 font-mono text-sm text-emerald-400">
                      curl -H "Authorization: Bearer YOUR_API_KEY" \ <br />
                      &nbsp;&nbsp;https://api.auroraenergy.app/v1/telemetry
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Database className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Endpoints</h2>
                </div>
                <div className="space-y-6">
                   {[
                      { method: "GET", path: "/v1/meters", desc: "List all smart meters active on your account." },
                      { method: "GET", path: "/v1/meters/{id}/telemetry", desc: "Retrieve real-time consumption data for a specific meter." },
                      { method: "POST", path: "/v1/forecast", desc: "Generate an AI-powered bill forecast based on historical data." }
                   ].map((endpoint) => (
                      <div key={endpoint.path} className="glass-card p-6 flex flex-col md:flex-row gap-6 md:items-center">
                         <div className="flex items-center gap-4 min-w-[200px]">
                            <span className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest leading-none">
                               {endpoint.method}
                            </span>
                            <code className="text-sm font-bold text-white">{endpoint.path}</code>
                         </div>
                         <p className="text-sm text-slate-400 font-medium">{endpoint.desc}</p>
                      </div>
                   ))}
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Globe className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Rate Limiting</h2>
                </div>
                <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                   Professional accounts are limited to 1,000 requests per minute. Enterprise accounts feature unlimited throughput via dedicated edge nodes.
                </p>
             </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ApiReference;

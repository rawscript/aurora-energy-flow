import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Bot, Sparkles, TrendingDown, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const AIForecasts = () => {
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
              AI Forecasts <br /> & Tips.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Aurora's intelligence engine analyzes your consumption habits to predict your bills and identify hidden inefficiencies.
            </p>
          </motion.div>

          <div className="space-y-16">
            <section>
              <div className="flex items-center gap-4 mb-8 text-primary">
                <Bot className="h-8 w-8" />
                <h2 className="text-3xl font-black tracking-tight text-white uppercase">How Forecasting Works</h2>
              </div>
              <p className="text-lg leading-relaxed text-slate-400 mb-8">
                Our machine learning models need about 3-7 days of continuous data to establish your baseline. Once calibrated, they project your usage through the rest of the billing cycle, allowing you to budget effectively.
              </p>
              
              {/* UI Explainer Mockup */}
              <div className="p-8 rounded-3xl bg-slate-900 border border-white/5 mx-auto max-w-sm w-full shadow-2xl relative">
                 <div className="absolute -top-4 -right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                   <Sparkles className="h-3 w-3" /> AI Powered
                 </div>
                 <div className="text-center mb-6">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Estimated Month Bill</p>
                    <h3 className="text-5xl font-black text-white">$45.50</h3>
                 </div>
                 <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 text-left">
                    <TrendingDown className="h-8 w-8 text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-100/80">You're tracking 12% lower than last month! Keep up the good work by keeping the AC at 24°C.</p>
                 </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-4 mb-8 text-primary">
                <Sparkles className="h-8 w-8" />
                <h2 className="text-3xl font-black tracking-tight text-white uppercase">Conversational AI</h2>
              </div>
              <p className="text-lg leading-relaxed text-slate-400 mb-6">
                Soon, you will be able to ask your dashboard questions directly. For example, "Why was my bill so high on Tuesday?" The AI will pinpoint the exact hours and appliances responsible for the surge.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIForecasts;

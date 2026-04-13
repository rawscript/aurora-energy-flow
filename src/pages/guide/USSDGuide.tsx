import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Phone, Hash, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const USSDGuide = () => {
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
              USSD Code <br /> Directory.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              No internet? No problem. Access your Aurora smart meter directly from any mobile phone using our verified shortcodes.
            </p>
          </motion.div>

          <div className="space-y-16">
            <section>
              <div className="flex items-center gap-4 mb-8 text-primary">
                <Hash className="h-8 w-8" />
                <h2 className="text-3xl font-black tracking-tight text-white uppercase">Accessing the Menu</h2>
              </div>
              <p className="text-lg leading-relaxed text-slate-400 mb-8">
                To launch the offline Aurora menu, simply dial <strong>*254*44#</strong> on your registered device. Ensure that your phone number is linked to your Aurora account via the dashboard.
              </p>
              
              {/* UI Explainer Mockup */}
              <div className="mx-auto max-w-[280px] rounded-[3rem] border-[8px] border-slate-900 bg-black overflow-hidden relative shadow-2xl aspect-[9/19]">
                 <div className="absolute top-0 w-full h-6 bg-slate-900 flex justify-center items-end pb-1">
                    <div className="w-16 h-1.5 bg-black rounded-full"></div>
                 </div>
                 <div className="p-6 pt-12 h-full flex flex-col font-mono text-emerald-400 text-sm leading-relaxed">
                    <p className="mb-4">Welcome to Aurora Energy.</p>
                    <p>1. Check Token Balance</p>
                    <p>2. Buy Electricity</p>
                    <p>3. Last 5 Readings</p>
                    <p>4. Bill Forecast</p>
                    <p>5. Help</p>
                    <div className="mt-auto border-t border-emerald-900/50 pt-4 flex gap-2">
                       <span className="text-emerald-500">{">"}</span>
                       <span className="animate-pulse">_</span>
                    </div>
                 </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-4 mb-8 text-primary">
                <CreditCard className="h-8 w-8" />
                <h2 className="text-3xl font-black tracking-tight text-white uppercase">M-PESA Integration</h2>
              </div>
              <p className="text-lg leading-relaxed text-slate-400 mb-6">
                When purchasing electricity via USSD, the system will automatically trigger an M-PESA STK push to your device. Upon entering your PIN, your meter will be topped up instantly.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default USSDGuide;

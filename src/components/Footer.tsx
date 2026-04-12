import React from 'react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-20 border-t border-white/5 bg-background">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
           </div>
           <div>
              <span className="text-xl font-black tracking-tighter text-white uppercase block">Aurora Energy</span>
              <span className="text-xs text-slate-500 font-medium">Empowering Kenya's Grid.</span>
           </div>
        </div>

        <div className="flex items-center gap-8">
           <Link to="/documentation" className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">Documentation</Link>
           <Link to="/privacy" className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">Privacy Infrastructure</Link>
           <a href="#" className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">SLA Status</a>
        </div>

        <p className="text-xs font-medium text-slate-600">
           © {new Date().getFullYear()} Aurora Smart Meter Solutions. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

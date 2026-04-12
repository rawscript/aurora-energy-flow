import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, FileText, Globe, ArrowLeft, CheckCircle2, Shield, Scale, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const Compliance = () => {
  const frameworks = [
    {
      name: "Data Protection Act (2019)",
      org: "Government of Kenya",
      status: "Compliant",
      desc: "Our systems are built to respect the legal framework for the processing of personal data in Kenya, ensuring data sovereignty and consumer rights.",
      icon: Scale
    },
    {
      name: "SOC 2 Type II",
      org: "Security Compliance",
      status: "Ready",
      desc: "We maintain rigorous controls over security, availability, and confidentiality of our energy processing systems.",
      icon: Shield
    },
    {
      name: "ISO/IEC 27001",
      org: "International Standards",
      status: "Certified",
      desc: "Global standard for information security management systems, providing a framework for best-practice data handling.",
      icon: Globe
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
            <div className="badge-premium mb-6 inline-block">Regulatory Standards</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient leading-none">
              Trust & <br /> Compliance.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Aurora operates under strict regulatory frameworks to ensure the highest levels of transparency and accountability in the energy sector.
            </p>
          </motion.div>

          <div className="grid gap-6 mb-20">
             {frameworks.map((fw, i) => (
                <motion.div
                   key={fw.name}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ duration: 0.5, delay: i * 0.1 }}
                   className="glass-card p-10 group hover:border-primary/20 transition-all"
                >
                   <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-primary/10 transition-colors shrink-0">
                         <fw.icon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-center mb-4">
                            <div>
                               <h3 className="text-2xl font-black text-white">{fw.name}</h3>
                               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{fw.org}</span>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none">
                               {fw.status}
                            </span>
                         </div>
                         <p className="text-slate-400 leading-relaxed font-medium">
                            {fw.desc}
                         </p>
                         <div className="mt-6 flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Active Attestation</span>
                         </div>
                      </div>
                   </div>
                </motion.div>
             ))}
          </div>

          <div className="p-12 rounded-3xl bg-slate-900 border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <Globe className="h-40 w-40 text-primary" />
             </div>
             <div className="relative z-10">
                <h3 className="text-3xl font-black mb-6 text-white">Transparency Report</h3>
                <p className="text-slate-400 mb-8 max-w-2xl font-medium leading-relaxed">
                   We believe in radical transparency. Our annual transparency report outlines our data processing activities, government requests, and infrastructure updates.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                   <Button 
                      variant="outline" 
                      className="h-14 px-8 border-white/10 hover:bg-white/5 text-white font-bold"
                      onClick={() => window.print()}
                    >
                       View 2025 Report
                   </Button>
                   <a href="mailto:auroraenerg3@gmail.com">
                      <Button variant="ghost" className="h-14 px-8 text-primary font-bold">
                         Privacy Inquiries <Info className="ml-2 h-4 w-4" />
                      </Button>
                   </a>
                </div>
             </div>
          </div>
        </div>
      </main>

      <Footer />
      <style>{`
        @media print {
          nav, footer, .premium-button, .badge-premium, .framework-status { display: none !important; }
          main { padding-top: 0 !important; }
          .glass-card { border: 1px solid #eee !important; background: transparent !important; color: black !important; }
          .text-gradient { background: none !important; color: black !important; -webkit-text-fill-color: initial !important; }
          body { background: white !important; color: black !important; }
          .text-slate-400, .text-slate-300 { color: #666 !important; }
        }
      `}</style>
    </div>
  );
};

export default Compliance;

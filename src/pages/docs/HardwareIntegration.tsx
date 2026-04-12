import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Cpu, Terminal, ArrowLeft, Settings, Activity, Smartphone, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const HardwareIntegration = () => {
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
            <div className="badge-premium mb-6 inline-block">Hardware Guide</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient leading-none">
              Hardware <br /> Integration.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Technical specifications for connecting physical smart meters to the Aurora cloud network using our proprietary edge processing architecture.
            </p>
          </motion.div>

          <div className="space-y-16">
             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Settings className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Integration Process</h2>
                </div>
                <div className="prose prose-invert max-w-none text-slate-400">
                   <p className="text-lg leading-relaxed mb-6">
                      Aurora provides a seamless integration path for energy utilities and residential smart meters. Our proprietary gateway technology ensures secure, low-latency telemetry without exposing internal grid configurations.
                   </p>
                   <div className="grid md:grid-cols-3 gap-6">
                      {[
                         { title: "Consultation", desc: "Our engineering team reviews your existing hardware infrastructure." },
                         { title: "Gateway Setup", desc: "Secure deployment of Aurora software onto compatible meter gateways." },
                         { title: "Validation", desc: "End-to-end testing of data integrity and encryption handshake." }
                      ].map((step, i) => (
                         <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold mb-4">{i + 1}</div>
                            <h4 className="font-bold text-white mb-2">{step.title}</h4>
                            <p className="text-sm">{step.desc}</p>
                         </div>
                      ))}
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Shield className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Onboarding</h2>
                </div>
                <div className="p-10 rounded-3xl bg-primary/5 border border-primary/10 text-center">
                   <h3 className="text-3xl font-black text-white mb-4">Start Your Integration</h3>
                   <p className="text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto mb-8">
                      For security reasons, hardware specifications and integration protocols are provided exclusively to onboarded partners. Reach out to our engineering team to begin the certification process.
                   </p>
                   <a href="mailto:auroraenerg3@gmail.com">
                      <Button className="premium-button h-16 px-10 text-lg">Contact Engineering to Get Onboarded</Button>
                   </a>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Smartphone className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Mobile SDK Access</h2>
                </div>
                <div className="glass-card p-8 flex flex-col md:flex-row gap-8 items-center justify-between">
                   <div className="flex-1">
                      <h3 className="text-xl font-black text-white mb-2">Build Your Own Custom Dashboards</h3>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed">
                         Request access to the Aurora Mobile SDK to build native iOS and Android experiences on top of our secure data mesh.
                      </p>
                   </div>
                   <Button variant="outline" className="border-white/10 text-white h-12 px-6 hover:bg-white/5">Request SDK Access</Button>
                </div>
             </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HardwareIntegration;

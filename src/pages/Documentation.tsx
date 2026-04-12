import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Book, Code, Terminal, Layers, ShieldCheck, Database, Cpu, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const Documentation = () => {
  const sections = [
    {
      title: "API Reference",
      icon: Terminal,
      content: "Complete documentation for the Aurora Energy REST and GraphQL APIs. Understand how to programmatically access real-time meter data and historical consumption trends.",
      color: "text-blue-400"
    },
    {
      title: "Hardware Integration",
      icon: Cpu,
      content: "Technical specifications for ESP8266 and ESP32 smart meter integrations. Step-by-step firmware deployment guide and telemetry protocol documentation.",
      color: "text-emerald-400"
    },
    {
      title: "System Architecture",
      icon: Layers,
      content: "A deep dive into Aurora's distributed infrastructure, focusing on low-latency MQTT message brokering and event-driven data processing.",
      color: "text-purple-400"
    },
    {
      title: "Data Schemas",
      icon: Database,
      content: "Explaining the energy consumption data models, multi-tenant isolation strategies, and the logic behind our AI forecasting engine.",
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
            <div className="badge-premium mb-6 inline-block">Platform Resources</div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-gradient">
              Documentation.
            </h1>
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed">
              Everything you need to integrate with Aurora's smart grid infrastructure and build energy-aware applications.
            </p>
          </motion.div>

          <div className="grid gap-6">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                id={section.title.toLowerCase().replace(/\s+/g, '-')}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card p-8 group hover:border-primary/20 transition-all scroll-mt-24"
              >
                <div className="flex gap-6 items-start">
                  <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-primary/5 transition-colors`}>
                    <section.icon className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black mb-3 tracking-tight text-white">{section.title}</h3>
                    <p className="text-slate-400 font-medium leading-relaxed">{section.content}</p>
                    <a href={`#${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <Button variant="link" className="mt-4 p-0 text-primary font-bold h-auto">
                        Explore Section <Book className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-20 p-10 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8">
             <div>
                <h3 className="text-2xl font-black mb-2 text-white">Need developer support?</h3>
                <p className="text-slate-400 font-medium">Join our community or contact our engineering team directly.</p>
             </div>
             <Button className="premium-button h-14 px-8">Contact Engineering</Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Documentation;

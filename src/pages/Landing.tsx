
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  TrendingDown, 
  Shield, 
  Brain, 
  ArrowRight, 
  Globe, 
  Cpu, 
  Database, 
  Smartphone, 
  LineChart, 
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Background Components ---

const EnergySphere = () => {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[1, 64, 64]} scale={2.5}>
        <MeshDistortMaterial
          color="#10b981"
          speed={3}
          distort={0.4}
          radius={1}
          emissive="#059669"
          emissiveIntensity={0.5}
        />
      </Sphere>
    </Float>
  );
};

// --- Navbar ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white uppercase">Aurora Energy</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
          <a href="#impact" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Impact</a>
          <a href="#tech" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Infrastructure</a>
          <Link to="/auth">
            <Button variant="ghost" className="text-sm font-bold text-white hover:bg-white/5">Sign In</Button>
          </Link>
          <Link to="/auth">
            <Button className="premium-button text-sm h-11 px-6">Deploy Now</Button>
          </Link>
        </div>

        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden p-6 bg-background border-b border-white/10 flex flex-col gap-4"
          >
            <a href="#features" className="text-lg font-medium text-slate-400">Features</a>
            <a href="#impact" className="text-lg font-medium text-slate-400">Impact</a>
            <a href="#tech" className="text-lg font-medium text-slate-400">Infrastructure</a>
            <hr className="border-white/5" />
            <Link to="/auth" className="w-full">
              <Button className="premium-button w-full h-12">Get Started</Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Main Page ---

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden min-h-screen flex items-center">
        <div className="mesh-glow" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1/2 h-[600px] hidden lg:block opacity-60">
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <EnergySphere />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="badge-premium mb-6 inline-block">Kenyan Energy Innovation</div>
            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-[0.9] tracking-tighter text-gradient">
              The Intelligence <br /> Behind The Grid.
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-xl mb-10 font-medium leading-relaxed">
              Optimizing electricity consumption in Kenya through AI-powered analytics and secure smart meter integration. Reduce expenditures by 20-30%.
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <Link to="/auth">
                <Button className="premium-button h-16 px-10 text-xl group">
                  Deploy Platform <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="ghost" className="outline-button h-16 px-10 text-lg border-white/5 text-slate-300">
                  Explore Features
                </Button>
              </a>
            </div>

            <div className="mt-16 flex items-center gap-8 grayscale opacity-50">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white">7.5M</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Grid Users</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white">20-30%</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Avg. Savings</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white">LIVE</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Telemetry</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Section */}
      <section id="impact" className="py-32 bg-slate-950/40 relative border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-gradient">Quantifiable Results.</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
              Moving beyond monitoring. We provide actionable conservation strategies that directly impact the bottom line for Kenyan households and utilities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Expenditure Reduction",
                desc: "Initial implementations demonstrate a 20-30% reduction in monthly energy costs through behavioral modification.",
                val: "30%",
                icon: TrendingDown
              },
              {
                title: "Universal Access",
                desc: "Integrated USSD and SMS interfaces ensure accessibility for all mobile platforms across Kenya's infrastructure.",
                val: "100%",
                icon: Smartphone
              },
              {
                title: "Grid Optimization",
                desc: "Identification of peak-hour overuse contributes to national grid load balancing and emission reduction targets.",
                val: "LIVE",
                icon: Globe
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-10 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-slate-400 font-medium leading-relaxed mb-8">{feature.desc}</p>
                <div className="text-4xl font-black text-white/20 group-hover:text-primary/20 transition-colors uppercase leading-none">
                  {feature.val}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-gradient">Enterprise Intelligence.</h2>
              <p className="text-lg text-slate-400 font-medium">
                Our AI Forecast Engine processes real-time consumption patterns to identify equipment anomalies and predict future billing cycles.
              </p>
            </div>
            <Link to="/auth">
              <Button variant="link" className="text-primary font-bold p-0 flex items-center gap-2">
                Deploy Infrastructure <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 glass-card p-10 bg-gradient-to-br from-primary/10 to-transparent flex flex-col justify-between">
              <div>
                <Brain className="h-10 w-10 text-primary mb-8" />
                <h3 className="text-3xl font-black tracking-tight mb-4">AI Forecast Engine</h3>
                <p className="text-slate-400 font-medium text-lg leading-relaxed">
                  Automated energy bill forecasting using dynamic tariff algorithms and predictive consumption modeling.
                </p>
              </div>
              <div className="mt-12 flex items-center gap-4">
                <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase text-slate-400">Machine Learning</span>
                <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase text-slate-400">Dynamic Tariff</span>
              </div>
            </div>

            <div className="glass-card p-10">
              <Shield className="h-10 w-10 text-primary mb-8" />
              <h3 className="text-xl font-black tracking-tight mb-4">Anomaly Detection</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                Identifies equipment anomalies and unauthorized consumption patterns instantly.
              </p>
            </div>

            <div className="glass-card p-10 bg-slate-900/40">
              <LineChart className="h-10 w-10 text-primary mb-8" />
              <h3 className="text-xl font-black tracking-tight mb-4">Behavioral Modification</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                Empowering users through AI-generated recommendations for efficiency optimization.
              </p>
            </div>

            <div className="glass-card p-10">
              <Database className="h-10 w-10 text-primary mb-8" />
              <h3 className="text-xl font-black tracking-tight mb-4">Scalable Infrastructure</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                Compatible with Kenya's 7.5 million grid-connected grid users without hardware changes.
              </p>
            </div>

            <div className="lg:col-span-2 glass-card p-10 bg-slate-900/40 flex items-center justify-between gap-12">
              <div className="max-w-sm">
                <Cpu className="h-10 w-10 text-primary mb-8" />
                <h3 className="text-3xl font-black tracking-tight mb-4">Secure Integration</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Military-grade encryption for secure smart meter API communication and data isolation.
                </p>
              </div>
              <div className="hidden sm:block">
                 <div className="w-32 h-32 rounded-full border border-primary/20 flex items-center justify-center animate-aurora-pulse">
                    <Shield className="h-12 w-12 text-primary" />
                 </div>
              </div>
            </div>

            <div className="glass-card p-10 lg:col-span-1 bg-primary/5">
              <CheckCircle2 className="h-8 w-8 text-primary mb-8" />
              <h3 className="text-xl font-black tracking-tight mb-4">Grid Balancing</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                Contributing to national energy policy objectives for load stability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section id="tech" className="py-32 bg-slate-950/40 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter text-gradient leading-none">
              Deploying The <br /> Future Infrastructure.
            </h2>
            <div className="space-y-6">
              {[
                { title: "Rapid Deployment", desc: "Compatible with existing utility systems for immediate rollout." },
                { title: "Universal Interface", desc: "Adaptive USSD, SMS, and Web interfaces for the Kenyan market." },
                { title: "Advanced Analytics", desc: "Machine learning for predictive household consumption modeling." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                   <div className="h-6 w-6 mt-1 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                   </div>
                   <div>
                      <h4 className="font-bold text-white mb-1">{item.title}</h4>
                      <p className="text-slate-400 font-medium text-sm">{item.desc}</p>
                   </div>
                </div>
              ))}
            </div>
            <Link to="/auth">
              <Button className="premium-button mt-12 h-14 px-8 text-lg">
                Join the Transition
              </Button>
            </Link>
          </div>

          <div className="glass-card aspect-square relative flex items-center justify-center overflow-hidden prestige-glow">
             <div className="absolute inset-0 opacity-20 mesh-glow" />
             <div className="relative z-10 w-4/5 h-4/5 border border-white/5 rounded-3xl bg-slate-950/80 p-8 shadow-2xl backdrop-blur-2xl">
                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                         <Zap className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-xs font-black tracking-widest text-slate-500 uppercase">System Telemetry</span>
                   </div>
                   <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20">
                      <span className="text-[10px] font-bold text-primary animate-pulse">HUB LINK ACTIVE</span>
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: "70%" }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="h-full bg-primary shadow-[0_0_20px_rgba(16,185,129,0.5)]" 
                      />
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: "45%" }}
                        transition={{ duration: 2, delay: 0.2, ease: "easeOut" }}
                        className="h-full bg-primary/60" 
                      />
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: "90%" }}
                        transition={{ duration: 2, delay: 0.4, ease: "easeOut" }}
                        className="h-full bg-primary/30" 
                      />
                   </div>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Savings Rate</span>
                      <span className="text-2xl font-black text-white">24.8%</span>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Grid Load</span>
                      <span className="text-2xl font-black text-white">OPTIMIZED</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
    </div>
  );
};

export default Landing;

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
              Technical specifications for connecting physical smart meters to the Aurora cloud network using ESP8266 and ESP32 microcontrollers.
            </p>
          </motion.div>

          <div className="space-y-16">
             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Cpu className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Supported Boards</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                   {[
                      { name: "ESP8266 (NodeMCU)", stats: "Single-core, 2.4GHz WiFi", recommendation: "Recommended for simple home residential monitoring." },
                      { name: "ESP32-S3", stats: "Dual-core, WiFi + BLE", recommendation: "Ideal for industrial systems requiring edge-computing analytics." }
                   ].map((board) => (
                      <div key={board.name} className="glass-card p-6 border-white/5 bg-slate-900/40">
                         <h4 className="text-xl font-bold text-white mb-2">{board.name}</h4>
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">{board.stats}</span>
                         <p className="text-sm text-slate-400 leading-relaxed font-medium">{board.recommendation}</p>
                      </div>
                   ))}
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Terminal className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Firmware Setup</h2>
                </div>
                <div className="prose prose-invert max-w-none text-slate-400">
                   <p className="text-lg leading-relaxed mb-6">
                      Our open-source firmware handles the secure MQTT connection and automated OTA updates.
                   </p>
                   <div className="bg-black p-6 rounded-2xl border border-white/5 font-mono text-sm">
                      <p className="text-slate-500 mb-2">// config.h settings</p>
                      <p className="text-white">#define MQTT_SERVER "mqtt.auroraenergy.app"</p>
                      <p className="text-white">#define DEVICE_ID "USER_METER_001"</p>
                      <p className="text-white">#define AUTH_TOKEN "SECURE_TOKEN"</p>
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-4 mb-8 text-primary">
                   <Smartphone className="h-8 w-8" />
                   <h2 className="text-3xl font-black tracking-tight text-white uppercase">Onboarding</h2>
                </div>
                <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row gap-8 items-center">
                   <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl font-black text-white mb-4">Native App Provisioning</h3>
                      <p className="text-slate-400 font-medium leading-relaxed">
                         The easiest way to provision meters is via our mobile app, which utilizes Bluetooth LE for zero-config credential handshakes.
                      </p>
                   </div>
                   <Button className="premium-button h-14 px-8">Get Mobile SDK</Button>
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

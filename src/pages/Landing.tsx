
import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Environment, Float, Html } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Zap, TrendingDown, Shield, Brain, ArrowRight, Play, Loader2, Sun, Globe, BarChart3, Cpu, Database } from 'lucide-react';
import * as THREE from 'three';
import { motion, AnimatePresence, Variants } from 'framer-motion';

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

// Error Boundary interfaces
interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// Error Boundary for 3D components
class ThreeJSErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log('Three.js Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-800/20 rounded-lg">
          <div className="text-center">
            <Zap className="h-12 w-12 text-aurora-green mx-auto mb-4" />
            <p className="text-white">3D Preview Loading...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading fallback component
const LoadingFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-aurora-green mx-auto mb-2" />
      <p className="text-white text-sm">Loading 3D Scene...</p>
    </div>
  </div>
);

// Simplified 3D Meter Box Component
const MeterBox = ({ onClick, isActive }: { onClick: () => void; isActive: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      try {
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        if (isActive) {
          meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.03);
        }
      } catch (error) {
        console.log('Animation error:', error);
      }
    }
  });

  return (
    <group onClick={onClick}>
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
        {/* Main meter box */}
        <Box ref={meshRef} args={[2, 2.5, 0.8]} position={[0, 0, 0]}>
          <meshStandardMaterial color={isActive ? "#10b981" : "#374151"} />
        </Box>
        
        {/* Digital display */}
        <Box args={[1.5, 0.8, 0.05]} position={[0, 0.5, 0.41]}>
          <meshStandardMaterial color="#000000" />
        </Box>
        
        {/* LED indicators */}
        <Sphere args={[0.05]} position={[-0.6, 0.5, 0.42]}>
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
        </Sphere>
        <Sphere args={[0.05]} position={[0.4, 0.5, 0.42]}>
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={isActive ? 0.8 : 0.2} />
        </Sphere>
        
        {/* Connection wires - simplified */}
        <Box args={[0.1, 1, 0.1]} position={[0.8, 1.5, 0]}>
          <meshStandardMaterial color="#dc2626" />
        </Box>
        <Box args={[0.1, 1, 0.1]} position={[-0.8, 1.5, 0]}>
          <meshStandardMaterial color="#1d4ed8" />
        </Box>
        
        {isActive && (
          <Html position={[0, -2, 0]} center>
            <div className="bg-slate-900/90 text-white p-4 rounded-lg max-w-xs text-center backdrop-blur-sm border border-aurora-green/20">
              <h3 className="font-bold text-aurora-green-light mb-2">Smart Meter Guide</h3>
              <p className="text-sm">This is your digital electricity meter. It records your energy consumption in real-time and communicates with Kenya Power.</p>
            </div>
          </Html>
        )}
      </Float>
    </group>
  );
};

// Simplified Energy Particles
const EnergyParticles = () => {
  const particlesRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (particlesRef.current) {
      try {
        particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      } catch (error) {
        console.log('Particles animation error:', error);
      }
    }
  });

  const particlePositions = React.useMemo(() => {
    const positions = new Float32Array(50 * 3); // Reduced particle count for better performance
    for (let i = 0; i < 50; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={50}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#10b981" transparent opacity={0.6} />
    </points>
  );
};

const Landing = () => {
  const [showMeterGuide, setShowMeterGuide] = useState(false);
  const [threeDLoaded, setThreeDLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-aurora-green/10 via-slate-900/50 to-slate-950/80 pointer-events-none" />
      
      {/* Hero Section with 3D Animation */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0">
          <ThreeJSErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Canvas 
                camera={{ position: [0, 0, 10], fov: 60 }}
                gl={{ 
                  antialias: true, 
                  alpha: true,
                  powerPreference: "default",
                  failIfMajorPerformanceCaveat: false
                }}
                onCreated={({ gl }) => {
                  gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                  setThreeDLoaded(true);
                }}
                fallback={<LoadingFallback />}
              >
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={0.5} />
                <spotLight position={[0, 15, 0]} angle={0.2} penumbra={1} intensity={0.8} color="#10b981" />
                
                <EnergyParticles />
                
                <OrbitControls 
                  enableZoom={false} 
                  enablePan={false} 
                  autoRotate 
                  autoRotateSpeed={0.5}
                  maxPolarAngle={Math.PI / 1.5}
                  minPolarAngle={Math.PI / 3}
                  enableDamping
                  dampingFactor={0.05}
                />
              </Canvas>
            </Suspense>
          </ThreeJSErrorBoundary>
        </div>
        
        {/* Glassmorphism Overlay Hero Content */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-20">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="glass-card p-10 sm:p-16 mb-8 text-center border-white/5 bg-slate-950/40 relative overflow-hidden prestige-glow"
          >
            <motion.div 
              variants={fadeIn}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border-aurora-green/30 text-aurora-green-light text-xs font-bold uppercase tracking-widest mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-aurora-green animate-pulse"></span>
              Next-Gen Energy Infrastructure
            </motion.div>
            
            <motion.h1 
              variants={fadeIn}
              className="text-5xl md:text-8xl font-black mb-6 bg-gradient-to-br from-white via-slate-200 to-aurora-green/80 bg-clip-text text-transparent tracking-tighter leading-[0.9] shadow-aurora-green/10"
            >
              The Future of <br className="hidden md:block" /> Smart Grid Intelligence
            </motion.h1>
            
            <motion.p 
              variants={fadeIn}
              className="text-lg md:text-2xl text-slate-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed"
            >
              Decentralizing power management through military-grade telemetry and AI forecast engines. Scalable infrastructure for the modern energy landscape.
            </motion.p>
            
            <motion.div 
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-5 justify-center items-center"
            >
              <Link to="/auth">
                <Button className="glass-button-primary h-16 px-12 text-xl font-bold group">
                  Deploy Platform <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="glass-button h-16 px-12 text-lg uppercase tracking-widest font-bold text-slate-300 hover:text-white border-white/10"
                onClick={() => setShowMeterGuide(true)}
              >
                <Play className="mr-2 h-5 w-5 text-aurora-blue-light" /> System Specs
              </Button>
            </motion.div>
          </motion.div>
          
          {!threeDLoaded && (
            <div className="text-sm font-bold tracking-widest uppercase text-slate-500 text-center">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Initializing 3D Telemetry...
            </div>
          )}
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-700 rounded-full flex justify-center backdrop-blur-md bg-slate-900/30">
            <div className="w-1 h-3 bg-aurora-green rounded-full mt-2 opacity-80"></div>
          </div>
        </div>
      </section>

      {/* 3D Meter Guide Section - Redesigned Modal */}
      {showMeterGuide && (
        <section className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
          <div className="relative w-full max-w-6xl h-[80vh] glass-card border-aurora-green/20 flex flex-col md:flex-row overflow-hidden shadow-2xl shadow-aurora-green/10">
            {/* 3D Canvas side */}
            <div className="w-full md:w-2/3 h-1/2 md:h-full relative bg-slate-950/50">
               <ThreeJSErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Canvas 
                    camera={{ position: [0, 0, 8], fov: 50 }}
                    gl={{ antialias: true, alpha: true }}
                  >
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#10b981" />
                    <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1} />
                    <MeterBox onClick={() => {}} isActive={true} />
                    <OrbitControls enableZoom={true} enablePan={true} enableDamping dampingFactor={0.05} />
                  </Canvas>
                </Suspense>
              </ThreeJSErrorBoundary>
            </div>
            
            {/* Info side */}
            <div className="w-full md:w-1/3 h-1/2 md:h-full p-8 flex flex-col justify-center border-l border-white/5 bg-slate-900/40">
              <Button 
                className="absolute top-4 right-4 glass-button w-10 h-10 p-0 border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                onClick={() => setShowMeterGuide(false)}
              >
                ✕
              </Button>
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Hardware Integration</h3>
              <p className="text-aurora-green-light font-bold text-xs uppercase tracking-widest mb-8">Hardware Interface Guide</p>
              
              <div className="space-y-8">
                <div className="glass-card p-4 border-white/5 bg-white/5">
                   <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Zap className="h-4 w-4 mr-2" /> Direct Connectivity</h4>
                   <p className="text-sm font-medium text-slate-300 leading-relaxed">Direct telemetry stream from your meter to the Aurora platform via secure encrypted channels.</p>
                </div>
                <div className="glass-card p-4 border-white/5 bg-white/5">
                   <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Shield className="h-4 w-4 mr-2" /> Edge Processing</h4>
                   <p className="text-sm font-medium text-slate-300 leading-relaxed">Consumption data is instantly analyzed locally to provide sub-second latency on cost estimations.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Investor Metrics Section */}
      <section className="py-20 relative z-10 bg-slate-950/50 border-y border-white/5 backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Active Nodes", value: "12,400+", icon: Globe, color: "text-aurora-blue-light" },
              { label: "Data Integrity", value: "99.99%", icon: Shield, color: "text-aurora-green-light" },
              { label: "Cost Savings", value: "$4.2M+", icon: BarChart3, color: "text-yellow-500" },
              { label: "Grid Latency", value: "<250ms", icon: Zap, color: "text-aurora-purple" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center group"
              >
                <div className="w-12 h-12 glass-card border-white/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="text-3xl font-black text-white mb-1 tracking-tighter">{stat.value}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white uppercase tracking-tighter">
              Advanced Telemetry
            </h2>
            <p className="text-lg font-medium text-slate-400 max-w-2xl mx-auto">
              Beyond simple monitoring. Access military-grade predictive analytics directly from your existing power infrastructure.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
             {/* Bento Item 1: Prophet Engine */}
             <motion.div 
               whileHover={{ y: -5 }}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="md:col-span-2 glass-card border-white/5 bg-gradient-to-br from-aurora-blue-light/5 to-transparent relative group overflow-hidden prestige-glow"
             >
                <div className="bento-inner p-8">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-aurora-blue-light/10 blur-[100px] rounded-full group-hover:bg-aurora-blue-light/20 transition-all duration-700"></div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">Predictive Analytics</h3>
                  <p className="text-slate-400 font-medium mb-8 max-w-md">Our algorithm predicts month-end expenses based on historical micro-patterns and current grid tariffs with 98% accuracy.</p>
                  
                  {/* Telemetry Mockup */}
                  <div className="glass-card border-white/10 p-4 bg-slate-950/80 transform group-hover:scale-[1.02] transition-transform duration-500 shadow-2xl mt-auto">
                     <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">7-Day Projection</span>
                        <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-aurora-green animate-pulse"></span>
                           <span className="text-[10px] font-bold text-aurora-green bg-aurora-green/10 px-2 py-0.5 rounded">LIVE ENGINE</span>
                        </div>
                     </div>
                     <div className="h-24 w-full flex items-end gap-2 px-2">
                         {[35, 45, 30, 60, 80, 50, 40, 65, 55, 75].map((h, i) => (
                             <motion.div 
                               key={i} 
                               initial={{ height: 0 }}
                               whileInView={{ height: `${h}%` }}
                               transition={{ delay: i * 0.05, duration: 0.5 }}
                               className="flex-1 bg-gradient-to-t from-aurora-blue-light/20 to-aurora-blue-light/60 rounded-t-sm"
                             ></motion.div>
                         ))}
                     </div>
                  </div>
                </div>
             </motion.div>

             {/* Bento Item 2: Sentinel Alerts */}
             <motion.div 
               whileHover={{ y: -5 }}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.1 }}
               className="glass-card border-white/5 bg-gradient-to-br from-red-500/5 to-transparent relative overflow-hidden group prestige-glow"
             >
                <div className="bento-inner p-8">
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/10 blur-[60px] rounded-full group-hover:bg-red-500/20 transition-all"></div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">Anomaly Detection</h3>
                  <p className="text-slate-400 font-medium text-sm mb-6 leading-relaxed">System-wide monitoring. Instant alerts for appliance degradation and unusual power spikes.</p>
                  
                  <div className="space-y-3 mt-auto relative z-10">
                     <motion.div 
                       initial={{ x: -20, opacity: 0 }}
                       whileInView={{ x: 0, opacity: 1 }}
                       className="glass-card p-3 border-red-500/20 bg-red-500/5 flex items-start gap-3"
                     >
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 animate-pulse shrink-0"></div>
                        <div>
                           <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Spike Detected</p>
                           <p className="text-xs text-slate-300 font-medium">Capacitor Load +45% threshold.</p>
                        </div>
                     </motion.div>
                  </div>
                </div>
             </motion.div>

             {/* Bento Item 3: Hardware Agnostic */}
             <motion.div 
               whileHover={{ y: -5 }}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.2 }}
               className="glass-card border-white/5 bg-gradient-to-br from-yellow-500/5 to-transparent group overflow-hidden prestige-glow"
             >
                <div className="bento-inner p-8 flex flex-col justify-between">
                  <div>
                    <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">Unified Nodes</h3>
                    <p className="text-slate-400 font-medium text-sm mb-4 leading-relaxed">Compatible with standard prepaid meters, off-grid solar arrays, and industrial 3-phase gateways.</p>
                  </div>
                  <div className="flex gap-4">
                     <div className="flex-1 glass-card p-4 border-white/5 text-center bg-slate-900/50 group-hover:bg-slate-800/80 transition-colors">
                        <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grid Smart</span>
                     </div>
                     <div className="flex-1 glass-card p-4 border-white/5 text-center bg-slate-900/50 group-hover:bg-slate-800/80 transition-colors">
                        <Sun className="h-6 w-6 text-aurora-green-light mx-auto mb-2" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Solar Arrays</span>
                     </div>
                  </div>
                </div>
             </motion.div>

             {/* Bento Item 4: Encryption */}
             <motion.div 
               whileHover={{ y: -5 }}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.3 }}
               className="md:col-span-2 glass-card border-white/5 bg-gradient-to-l from-slate-800/50 to-transparent prestige-glow group"
             >
                <div className="bento-inner p-8 flex items-center justify-between gap-8">
                  <div>
                     <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">Sovereign Data</h3>
                     <p className="text-slate-400 font-medium max-w-md leading-relaxed">Enterprise-grade isolation. Consumer data signatures are AES-256 encrypted at the hardware level before cloud ingestion.</p>
                  </div>
                  <div className="hidden sm:flex w-28 h-28 rounded-full border-2 border-aurora-green/20 items-center justify-center relative shrink-0">
                     <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                       className="absolute inset-2 border-2 border-dashed border-aurora-green/40 rounded-full"
                     ></motion.div>
                     <Shield className="h-10 w-10 text-aurora-green text-glow" />
                  </div>
                </div>
             </motion.div>
          </div>
        </div>
      </section>

      {/* Technical Pipeline Visualization */}
      <section className="py-32 px-6 relative z-10 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
              <h2 className="text-4xl md:text-6xl font-black mb-8 text-white tracking-tighter leading-none">
                The Aurora <br className="hidden md:block"/> <span className="text-aurora-green">Neural Stack</span>
              </h2>
              <div className="space-y-6">
                 {[
                   { title: "Edge Telemetry", desc: "Proprietary MQTT-bridge for zero-loss consumption streaming.", icon: Cpu },
                   { title: "Sovereign Vault", desc: "AES-256 encrypted Supabase backend with role-based isolation.", icon: Database },
                   { title: "Forecast Engine", desc: "Machine learning models trained on millions of grid signatures.", icon: Brain }
                 ].map((item, i) => (
                   <div key={i} className="flex gap-4 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-5 w-5 text-aurora-green" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white tracking-tight">{item.title}</h4>
                        <p className="text-sm text-slate-400 font-medium">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
            <div className="flex-1 w-full aspect-square glass-card border-white/10 bg-slate-950/60 p-8 flex items-center justify-center relative overflow-hidden bento-inner">
               <div className="absolute inset-0 opacity-20 mesh-gradient"></div>
               <div className="relative z-10 w-full h-full flex items-center justify-center">
                  {/* Schematic Mockup */}
                  <div className="relative w-48 h-48 border-2 border-aurora-green/20 rounded-full flex items-center justify-center animate-aurora-pulse">
                     <div className="w-32 h-32 border-2 border-aurora-blue-light/20 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                        <Zap className="h-12 w-12 text-aurora-green text-glow" />
                     </div>
                     <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-white/10 rounded text-[8px] font-bold text-slate-500 tracking-widest">INGESTION</div>
                     <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-white/10 rounded text-[8px] font-bold text-slate-500 tracking-widest">ANALYSIS</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Section */}
      <section className="py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center glass-card p-12 sm:p-20 border-white/10 bg-slate-900/40 relative overflow-hidden prestige-glow"
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-aurora-green/10 to-aurora-blue-light/10 blur-[120px] rounded-full pointer-events-none"></div>
          
          <h2 className="text-5xl md:text-7xl font-black mb-8 text-white tracking-tighter leading-none relative z-10">
            Scale Your <br className="hidden md:block" /> Energy <span className="text-aurora-green">Ecosystem</span>
          </h2>
          <p className="text-xl font-medium text-slate-400 mb-12 max-w-xl mx-auto relative z-10">
            Ready to integrate with the standard in energy telemetry? Join the transition to a smarter, decentralized grid.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center relative z-10">
            <Link to="/auth">
              <Button className="glass-button-primary h-18 px-14 text-2xl font-black shadow-2xl shadow-aurora-green/20 uppercase tracking-tighter">
                Register Platform
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Minimal Tech Footer */}
      <footer className="py-8 px-6 border-t border-white/10 bg-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 glass-card border-aurora-green/30 flex items-center justify-center bg-aurora-green/10">
              <Zap className="h-4 w-4 text-aurora-green-light" />
            </div>
            <span className="font-black text-white tracking-widest uppercase">Aurora Energy</span>
          </div>
          <div className="flex items-center gap-6">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 cursor-pointer transition-colors">v2.1.0 Stable</span>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 cursor-pointer transition-colors">Encrypted Logs</span>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 cursor-pointer transition-colors">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Environment, Float, Html } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Zap, TrendingDown, Shield, Brain, ArrowRight, Play, Loader2, Sun } from 'lucide-react';
import * as THREE from 'three';

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
          <div className="glass-card p-10 sm:p-16 mb-8 text-center border-white/5 bg-slate-950/40">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border-aurora-green/30 text-aurora-green-light text-xs font-bold uppercase tracking-widest mb-8">
              <span className="w-2 h-2 rounded-full bg-aurora-green animate-pulse"></span>
              Platform Status: Optimal
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-br from-white via-slate-200 to-aurora-green/80 bg-clip-text text-transparent tracking-tight shadow-aurora-green/10">
              Enterprise-Grade <br className="hidden md:block" /> Energy Intelligence
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
              Modernize your power tracking. Seamlessly integrate your existing smart meters or solar inverters with our analytics platform to forecast expenses, detect anomalies, and optimize efficiency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <Link to="/auth">
                <Button className="glass-button-primary h-14 px-10 text-lg font-bold">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="glass-button h-14 px-10 text-lg uppercase tracking-widest font-bold text-slate-300 hover:text-white"
                onClick={() => setShowMeterGuide(true)}
              >
                <Play className="mr-2 h-5 w-5 text-aurora-blue-light" /> Hardware Preview
              </Button>
            </div>
          </div>
          
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

      {/* Bento Box Layout replacing generic features grid */}
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
             {/* Bento Item 1: Prophet Engine (Large, spans 2 columns) */}
             <div className="md:col-span-2 glass-card p-8 border-white/5 bg-gradient-to-br from-aurora-blue-light/5 to-transparent relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-aurora-blue-light/10 blur-[100px] rounded-full group-hover:bg-aurora-blue-light/20 transition-all duration-700"></div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Predictive Analytics</h3>
                <p className="text-slate-400 font-medium mb-8 max-w-md">Our algorithm predicts your exact month-end bill based on historical micro-patterns and current grid tariffs.</p>
                
                {/* Telemetry Mockup */}
                <div className="glass-card border-white/10 p-4 bg-slate-950/80 transform group-hover:-translate-y-2 transition-transform duration-500 shadow-2xl mt-auto">
                   <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">7-Day Projection</span>
                      <span className="text-[10px] font-bold text-aurora-green bg-aurora-green/10 px-2 py-0.5 rounded">98% CONFIDENCE</span>
                   </div>
                   <div className="h-20 w-full flex items-end gap-2 px-2">
                       {[35, 45, 30, 60, 80, 50, 40].map((h, i) => (
                           <div key={i} className="flex-1 bg-gradient-to-t from-aurora-blue-light/20 to-aurora-blue-light/60 rounded-t-sm" style={{ height: `${h}%` }}></div>
                       ))}
                   </div>
                </div>
             </div>

             {/* Bento Item 2: Sentinel Alerts */}
             <div className="glass-card p-8 border-white/5 bg-gradient-to-br from-red-500/5 to-transparent relative overflow-hidden group">
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/10 blur-[60px] rounded-full group-hover:bg-red-500/20 transition-all"></div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Anomaly Detection</h3>
                <p className="text-slate-400 font-medium text-sm mb-6">Real-time usage monitoring. We alert you instantly if specific appliances begin consuming unusual power amounts.</p>
                
                <div className="space-y-3 mt-auto relative z-10">
                   <div className="glass-card p-3 border-red-500/20 bg-red-500/5 flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 animate-pulse shrink-0"></div>
                      <div>
                         <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Spike Detected</p>
                         <p className="text-xs text-slate-300 font-medium">HVAC load +45% above normal.</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Bento Item 3: Hardware Agnostic */}
             <div className="glass-card p-8 border-white/5 bg-gradient-to-br from-yellow-500/5 to-transparent flex flex-col justify-between group overflow-hidden">
                <div>
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Hardware Agnostic</h3>
                  <p className="text-slate-400 font-medium text-sm mb-4">Seamlessly connect regardless of infrastructure. From standard KPLC prepaid nodes to complex Solar Inverter gateways.</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex-1 glass-card p-3 border-white/5 text-center bg-slate-900/50">
                      <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KPLC Smart</span>
                   </div>
                   <div className="flex-1 glass-card p-3 border-white/5 text-center bg-slate-900/50">
                      <Sun className="h-6 w-6 text-aurora-green-light mx-auto mb-2" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Solar Arrays</span>
                   </div>
                </div>
             </div>

             {/* Bento Item 4: Encryption */}
             <div className="md:col-span-2 glass-card p-8 border-white/5 bg-gradient-to-l from-slate-800/50 to-transparent flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Enterprise Security</h3>
                   <p className="text-slate-400 font-medium max-w-md">Your consumption signatures are locked behind AES-256 protocols. Your data never leaves your personal sovereign vault without explicit consent.</p>
                </div>
                <div className="hidden sm:flex w-24 h-24 rounded-full border border-aurora-green/20 items-center justify-center relative">
                   <div className="absolute inset-2 border border-dashed border-aurora-green/40 rounded-full animate-[spin_10s_linear_infinite]"></div>
                   <Shield className="h-8 w-8 text-aurora-green" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Action Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center glass-card p-12 sm:p-20 border-white/10 bg-slate-900/40 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-aurora-green/10 to-aurora-blue-light/10 blur-[120px] rounded-full pointer-events-none"></div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-8 text-white tracking-tight relative z-10">
            Take Control of Your <br/> <span className="text-aurora-green">Energy Operations</span>
          </h2>
          <p className="text-xl font-medium text-slate-400 mb-12 max-w-xl mx-auto relative z-10">
            Join thousands of modern households and businesses optimizing their power consumption across Kenya.
          </p>
          
          <Link to="/auth" className="relative z-10 inline-block">
            <Button className="glass-button-primary h-16 px-12 text-xl font-bold shadow-2xl shadow-aurora-green/20">
              Create Free Account
            </Button>
          </Link>
        </div>
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

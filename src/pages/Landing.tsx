
import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Environment, Float, Html } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Zap, TrendingDown, Shield, Brain, ArrowRight, Play, Loader2 } from 'lucide-react';
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

  const features = [
    {
      icon: <Brain className="h-8 w-8 text-aurora-green-light" />,
      title: "AI-Powered Insights",
      description: "Smart algorithms predict your energy usage patterns and suggest optimizations"
    },
    {
      icon: <TrendingDown className="h-8 w-8 text-aurora-blue-light" />,
      title: "Cost Reduction",
      description: "Reduce your electricity bills by up to 30% with intelligent monitoring"
    },
    {
      icon: <Shield className="h-8 w-8 text-aurora-green" />,
      title: "Real-time Monitoring",
      description: "Track your energy consumption in real-time with Kenya Power integration"
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-400" />,
      title: "Smart Alerts",
      description: "Get notified about unusual consumption patterns and maintenance needs"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
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
                  console.log('Three.js Canvas created successfully');
                }}
                fallback={<LoadingFallback />}
              >
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={0.8} />
                <spotLight position={[0, 15, 0]} angle={0.2} penumbra={1} intensity={0.6} />
                
                <EnergyParticles />
                
                <OrbitControls 
                  enableZoom={false} 
                  enablePan={false} 
                  autoRotate 
                  autoRotateSpeed={0.2}
                  maxPolarAngle={Math.PI}
                  minPolarAngle={0}
                  enableDamping
                  dampingFactor={0.05}
                />
              </Canvas>
            </Suspense>
          </ThreeJSErrorBoundary>
        </div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-aurora-green-light via-aurora-blue-light to-aurora-green bg-clip-text text-transparent animate-aurora-pulse">
              Aurora Energy
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-8">
              Revolutionizing Energy Management in Kenya
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
              Harness the power of AI to optimize your electricity consumption, reduce costs, and contribute to a sustainable future.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth">
              <Button className="bg-aurora-green hover:bg-aurora-green-light text-white px-8 py-4 text-lg rounded-full transition-all duration-300 transform hover:scale-105">
                Get Started <ArrowRight className="ml-2" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="border-aurora-blue-light text-aurora-blue-light hover:bg-aurora-blue-light hover:text-white px-8 py-4 text-lg rounded-full transition-all duration-300"
              onClick={() => setShowMeterGuide(true)}
            >
              <Play className="mr-2" /> View Meter Guide
            </Button>
          </div>
          
          {!threeDLoaded && (
            <div className="mt-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Loading 3D environment...
            </div>
          )}
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-aurora-green-light rounded-full flex justify-center">
            <div className="w-1 h-3 bg-aurora-green-light rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* 3D Meter Guide Section */}
      {showMeterGuide && (
        <section className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full">
            <ThreeJSErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <Canvas 
                  camera={{ position: [0, 0, 8], fov: 50 }}
                  gl={{ 
                    antialias: true, 
                    alpha: true,
                    powerPreference: "default"
                  }}
                >
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1} />
                  
                  <MeterBox onClick={() => {}} isActive={true} />
                  
                  <OrbitControls enableZoom={true} enablePan={true} enableDamping dampingFactor={0.05} />
                </Canvas>
              </Suspense>
            </ThreeJSErrorBoundary>
            
            <Button 
              className="absolute top-6 right-6 bg-red-600 hover:bg-red-700 z-10"
              onClick={() => setShowMeterGuide(false)}
            >
              Close Guide
            </Button>
            
            <div className="absolute bottom-6 left-6 right-6 z-10">
              <Card className="bg-slate-900/90 border-aurora-green/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-aurora-green-light mb-4">Understanding Your Smart Meter</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-aurora-blue-light mb-2">Key Components:</h4>
                      <ul className="space-y-1 text-gray-300">
                        <li>• Digital Display: Shows current usage</li>
                        <li>• LED Indicators: Power and connection status</li>
                        <li>• Connection Wires: Live and neutral lines</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-aurora-blue-light mb-2">How It Works:</h4>
                      <ul className="space-y-1 text-gray-300">
                        <li>• Measures electricity consumption in real-time</li>
                        <li>• Sends data to Kenya Power automatically</li>
                        <li>• Enables accurate billing and monitoring</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-aurora-green to-aurora-blue-light bg-clip-text text-transparent">
              Why Choose Aurora Energy?
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Experience the future of energy management with cutting-edge technology designed for Kenyan households and businesses.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-slate-800/50 border-aurora-green/20 hover:border-aurora-green/40 transition-all duration-300 hover:transform hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 px-6 bg-slate-800/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8 text-aurora-green-light">
            Making a Real Impact in Kenya
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <div className="text-4xl font-bold text-aurora-blue-light mb-2">30%</div>
              <p className="text-gray-400">Average cost reduction</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-aurora-green-light mb-2">24/7</div>
              <p className="text-gray-400">Real-time monitoring</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">AI</div>
              <p className="text-gray-400">Powered insights</p>
            </div>
          </div>
          
          <Link to="/auth">
            <Button className="bg-aurora-gradient text-white px-12 py-4 text-xl rounded-full hover:scale-105 transition-transform duration-300">
              Start Your Energy Journey
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-aurora-green/20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-aurora-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-aurora-green-light to-aurora-blue-light bg-clip-text text-transparent">
              Aurora Energy
            </h3>
          </div>
          <p className="text-gray-400 mb-4">
            Empowering Kenya with intelligent energy management solutions.
          </p>
          <p className="text-sm text-gray-500">
            © 2024 Aurora Energy. Built with love for sustainable energy.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

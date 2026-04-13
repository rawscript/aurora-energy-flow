import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden text-foreground selection:bg-primary/30">
      
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 glass-card p-12 max-w-lg w-full mx-4 border-primary/20 text-center flex flex-col items-center"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <AlertTriangle className="h-10 w-10 text-primary" />
        </div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-7xl font-black text-white tracking-tighter mb-4"
        >
          404
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-xl font-medium text-slate-300 mb-2"
        >
          Grid Disconnected
        </motion.p>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-sm text-slate-500 mb-10"
        >
          The page you are looking for has been moved or no longer exists. Ensure your telemetry endpoint is correct.
        </motion.p>

        <motion.div
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.5, duration: 0.5 }}
           className="flex flex-col sm:flex-row gap-4 w-full"
        >
          <Link to="/" className="w-full">
            <Button className="w-full premium-button h-12 text-sm font-bold shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <Zap className="mr-2 h-4 w-4" /> Return to Genesis
            </Button>
          </Link>
          <Button variant="outline" className="w-full h-12 text-sm font-bold border-white/10 hover:bg-white/5" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </motion.div>
      </motion.div>
      
      {/* Footer minimal tag */}
      <div className="absolute bottom-6 text-xs font-bold tracking-widest text-slate-600 uppercase">
        Aurora Energy Platform
      </div>
    </div>
  );
};

export default NotFound;

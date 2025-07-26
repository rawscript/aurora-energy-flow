import React from 'react';
import { Zap } from 'lucide-react';

interface MobileLoadingSpinnerProps {
  message?: string;
}

const MobileLoadingSpinner: React.FC<MobileLoadingSpinnerProps> = ({ 
  message = "Loading..." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-aurora-dark p-4">
      <div className="relative">
        <div className="w-16 h-16 bg-aurora-gradient rounded-full flex items-center justify-center mb-4 animate-pulse">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-aurora-green/30 border-t-aurora-green rounded-full animate-spin"></div>
      </div>
      <p className="text-aurora-green-light text-sm font-medium">{message}</p>
      <p className="text-gray-400 text-xs mt-2">Aurora Energy Monitor</p>
    </div>
  );
};

export default MobileLoadingSpinner;
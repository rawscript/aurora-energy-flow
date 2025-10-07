import React from 'react';
import SolarDashboard from './SolarDashboard';

interface PayAsYouGoDashboardProps {
  energyProvider?: string;
}

const PayAsYouGoDashboard: React.FC<PayAsYouGoDashboardProps> = ({ energyProvider = 'Solar' }) => {
  return <SolarDashboard energyProvider={energyProvider} />;
};

export default PayAsYouGoDashboard;
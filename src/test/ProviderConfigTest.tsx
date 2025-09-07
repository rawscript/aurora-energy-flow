import { ProviderConfig } from '@/contexts/EnergyProviderContext';

const testConfig: ProviderConfig = {
  name: 'Test Provider',
  type: 'grid',
  features: ['test'],
  terminology: {
    device: 'meter',
    credits: 'credits',
    payment: 'prepaid',
    setup: 'Meter Setup',
    dashboard: 'Energy Credits'
  },
  settings: {
    supportsBatteries: false,
    supportsInverters: false,
    supportsTokens: false,
    supportsPayAsYouGo: false,
    defaultRate: 0.15
  },
  colors: {
    primary: '#000000',
    secondary: '#111111',
    accent: '#222222'
  },
  icon: 'Test'
};

export default testConfig;

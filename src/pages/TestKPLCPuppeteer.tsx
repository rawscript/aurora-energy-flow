import React from 'react';
import KPLCBillDashboard from '../components/KPLCBillDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TestKPLCPuppeteer: React.FC = () => {
  return (
    <div className="min-h-screen bg-aurora-dark p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-aurora-card border-aurora-green/20 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-aurora-green-light">
              KPLC Puppeteer Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page demonstrates the KPLC puppeteer functionality for fetching bill data directly from the KPLC portal.
            </p>
          </CardContent>
        </Card>
        
        <KPLCBillDashboard />
      </div>
    </div>
  );
};

export default TestKPLCPuppeteer;
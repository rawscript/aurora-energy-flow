import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateMLInsights, type MLInsight, type EnergyReading } from '@/utils/mlInsights';

const MLTestComponent = () => {
  const [mlInsights, setMlInsights] = useState<MLInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock energy readings for testing
  const mockReadings: EnergyReading[] = [
    {
      id: '1',
      user_id: 'user1',
      meter_number: 'meter1',
      reading_date: '2023-01-01',
      kwh_consumed: 10,
      total_cost: 200
    },
    {
      id: '2',
      user_id: 'user1',
      meter_number: 'meter1',
      reading_date: '2023-01-02',
      kwh_consumed: 15,
      total_cost: 300
    },
    {
      id: '3',
      user_id: 'user1',
      meter_number: 'meter1',
      reading_date: '2023-01-03',
      kwh_consumed: 12,
      total_cost: 240
    },
    {
      id: '4',
      user_id: 'user1',
      meter_number: 'meter1',
      reading_date: '2023-01-04',
      kwh_consumed: 18,
      total_cost: 360
    },
    {
      id: '5',
      user_id: 'user1',
      meter_number: 'meter1',
      reading_date: '2023-01-05',
      kwh_consumed: 20,
      total_cost: 400
    },
    {
      id: '6',
      user_id: 'user1',
      meter_number: 'meter1',
      reading_date: '2023-01-06',
      kwh_consumed: 22,
      total_cost: 440
    },
    {
      id: '7',
      user_id: 'user1',
      meter_number: 'meter1',
      reading_date: '2023-01-07',
      kwh_consumed: 25,
      total_cost: 500
    }
  ];

  const testMLInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Generating ML insights...');
      const insights = await generateMLInsights('household', undefined, mockReadings);
      console.log('Generated insights:', insights);
      setMlInsights(insights);
    } catch (err) {
      console.error('Error generating ML insights:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-aurora-card border-aurora-purple/20">
      <CardHeader>
        <CardTitle className="text-xl text-aurora-purple-light">
          ML Insights Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testMLInsights} disabled={loading}>
          {loading ? 'Generating Insights...' : 'Test ML Insights'}
        </Button>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <h3 className="font-medium text-red-400">Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {mlInsights.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-aurora-green-light">
              Generated {mlInsights.length} ML Insights:
            </h3>
            {mlInsights.map((insight) => {
              const IconComponent = insight.icon;
              return (
                <div 
                  key={insight.id} 
                  className={`p-3 rounded-lg border ${
                    insight.severity === 'alert' ? 'bg-red-500/10 border-red-500/20' :
                    insight.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                    insight.severity === 'success' ? 'bg-green-500/10 border-green-500/20' :
                    'bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <IconComponent className={`h-5 w-5 ${
                      insight.severity === 'alert' ? 'text-red-400' :
                      insight.severity === 'warning' ? 'text-amber-400' :
                      insight.severity === 'success' ? 'text-green-400' :
                      'text-blue-400'
                    }`} />
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        insight.severity === 'alert' ? 'text-red-400' :
                        insight.severity === 'warning' ? 'text-amber-400' :
                        insight.severity === 'success' ? 'text-green-400' :
                        'text-blue-400'
                      }`}>
                        {insight.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-400">
                        <span className="mr-3">Confidence: {insight.confidence.toFixed(1)}%</span>
                        <span>Model: {insight.mlModel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MLTestComponent;
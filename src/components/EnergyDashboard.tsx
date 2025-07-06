
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Battery, House, Sun, Monitor, Zap } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { format } from 'date-fns';

const deviceData = [
  { name: 'HVAC', value: 35, color: '#10b981' },
  { name: 'Lighting', value: 25, color: '#3b82f6' },
  { name: 'Appliances', value: 20, color: '#a855f7' },
  { name: 'Electronics', value: 20, color: '#f59e0b' },
];

const EnergyDashboard = () => {
 const { energyData, recentReadings, loading, simulateReading } = useRealTimeEnergy();
  // const { energyData, recentReadings, loading} = useRealTimeEnergy();

  // Transform recent readings for charts
  const chartData = recentReadings.slice(0, 12).reverse().map(reading => ({
    time: format(new Date(reading.reading_date), 'HH:mm'),
    usage: Number(reading.kwh_consumed),
    cost: Number(reading.total_cost),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aurora-green-light"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Real-time Status Banner */}
      <Card className="bg-aurora-card border-aurora-green/20 aurora-glow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-aurora-green-light">Live Smart Meter Data</span>
            </div>
            <Button 
              onClick={simulateReading}
              size="sm"
              className="bg-aurora-green hover:bg-aurora-green/80"
            >
              <Zap className="h-4 w-4 mr-2" />
              Live feed Reading
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-aurora-card border-aurora-green/20 aurora-glow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Battery className="h-8 w-8 text-aurora-green-light" />
              <div>
                <p className="text-sm text-muted-foreground">Current Usage</p>
                <p className="text-2xl font-bold text-aurora-green-light">
                  {energyData.current_usage.toFixed(1)} kW
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-blue/20 aurora-glow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <House className="h-8 w-8 text-aurora-blue-light" />
              <div>
                <p className="text-sm text-muted-foreground">Daily Total</p>
                <p className="text-2xl font-bold text-aurora-blue-light">
                  {energyData.daily_total.toFixed(1)} kWh
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-aurora-purple/20 aurora-glow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Sun className="h-8 w-8 text-aurora-purple-light" />
              <div>
                <p className="text-sm text-muted-foreground">Cost Today</p>
                <p className="text-2xl font-bold text-aurora-purple-light">
                  KSh {energyData.daily_cost.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-aurora-card border-emerald-500/20 aurora-glow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Monitor className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-sm text-muted-foreground">Efficiency</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {energyData.efficiency_score}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Usage Chart */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-green-light">Real-time Energy Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : [{ time: 'No data', usage: 0 }]}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #10b981',
                    borderRadius: '8px'
                  }} 
                />
                <Area
                  type="monotone"
                  dataKey="usage"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorUsage)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Usage Breakdown */}
        <Card className="bg-aurora-card border-aurora-blue/20">
          <CardHeader>
            <CardTitle className="text-xl text-aurora-blue-light">Device Usage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {deviceData.map((device, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: device.color }}
                    />
                    <span className="text-sm">{device.name}</span>
                  </div>
                  <span className="text-sm font-medium">{device.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Analysis */}
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader>
            <CardTitle className="text-xl text-aurora-purple-light">Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.length > 0 ? chartData : [{ time: 'No data', cost: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #a855f7',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#a855f7"
                    strokeWidth={3}
                    dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnergyDashboard;

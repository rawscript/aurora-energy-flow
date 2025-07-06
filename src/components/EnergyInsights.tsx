
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, Battery, Sun, House } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const weeklyData = [
  { day: 'Mon', usage: 85, efficiency: 92 },
  { day: 'Tue', usage: 78, efficiency: 88 },
  { day: 'Wed', usage: 92, efficiency: 85 },
  { day: 'Thu', usage: 76, efficiency: 94 },
  { day: 'Fri', usage: 88, efficiency: 89 },
  { day: 'Sat', usage: 95, efficiency: 82 },
  { day: 'Sun', usage: 82, efficiency: 91 },
];
//update to be more than hardcoded values
const insights = [
  {
    id: 1,
    type: 'savings',
    title: 'Peak Hour Opportunity',
    description: 'You could save $12/month by shifting 20% of usage to off-peak hours',
    impact: 'High',
    icon: Sun,
    color: 'text-aurora-green-light'
  },
  {
    id: 2,
    type: 'efficiency',
    title: 'HVAC Optimization',
    description: 'Your HVAC system is running 15% longer than optimal during peak hours',
    impact: 'Medium',
    icon: House,
    color: 'text-aurora-blue-light'
  },
  {
    id: 3,
    type: 'alert',
    title: 'Standby Power Detection',
    description: 'Devices are consuming 8% more power in standby mode than average',
    impact: 'Low',
    icon: Battery,
    color: 'text-aurora-purple-light'
  }
];

const EnergyInsights = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Efficiency Score */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-green-light">Energy Efficiency Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-4xl font-bold text-aurora-green-light mb-2">87%</div>
              <p className="text-muted-foreground">Above average efficiency</p>
            </div>
            <div className="w-32 h-32 relative">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="87, 100"
                  className="animate-aurora-pulse"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-aurora-green-light">87%</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-aurora-blue-light">+12%</div>
              <p className="text-sm text-muted-foreground">vs last month</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-aurora-purple-light">3rd</div>
              <p className="text-sm text-muted-foreground">in neighborhood</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-400">$24</div>
              <p className="text-sm text-muted-foreground">saved this month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Performance */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-blue-light">Weekly Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #3b82f6',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="usage" fill="#3b82f6" name="Usage %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-aurora-blue-light rounded"></div>
              <span className="text-sm">Usage %</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-aurora-green-light rounded"></div>
              <span className="text-sm">Efficiency %</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-aurora-card border-aurora-purple/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-purple-light flex items-center space-x-2">
            <Info className="h-6 w-6" />
            <span>AI-Powered Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight) => {
            const IconComponent = insight.icon;
            return (
              <div key={insight.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-aurora-green/30 transition-colors">
                <div className="flex items-start space-x-3">
                  <IconComponent className={`h-6 w-6 ${insight.color} mt-1`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{insight.title}</h3>
                      <Badge 
                        variant={insight.impact === 'High' ? 'destructive' : insight.impact === 'Medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {insight.impact} Impact
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Goals & Progress */}
      <Card className="bg-aurora-card border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-xl text-emerald-400">Monthly Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Reduce Usage by 10%</span>
              <span className="text-sm text-emerald-400">7.2% achieved</span>
            </div>
            <Progress value={72} className="h-2 bg-slate-800" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Peak Hour Reduction</span>
              <span className="text-sm text-aurora-blue-light">45% achieved</span>
            </div>
            <Progress value={45} className="h-2 bg-slate-800" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Cost Savings Target</span>
              <span className="text-sm text-aurora-purple-light">62% achieved</span>
            </div>
            <Progress value={62} className="h-2 bg-slate-800" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnergyInsights;

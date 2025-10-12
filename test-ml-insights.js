import { generateMLInsights } from './src/utils/mlInsights.ts';

// Test data
const testData = [
  {
    id: '1',
    user_id: 'user1',
    meter_number: 'meter1',
    reading_date: '2023-01-01T08:00:00Z',
    kwh_consumed: 10,
    total_cost: 250,
    peak_demand: 5,
    power_factor: 0.8,
    voltage: 240,
    current: 5,
    frequency: 50
  },
  {
    id: '2',
    user_id: 'user1',
    meter_number: 'meter1',
    reading_date: '2023-01-02T08:00:00Z',
    kwh_consumed: 15,
    total_cost: 375,
    peak_demand: 7,
    power_factor: 0.85,
    voltage: 240,
    current: 7,
    frequency: 50
  },
  {
    id: '3',
    user_id: 'user1',
    meter_number: 'meter1',
    reading_date: '2023-01-03T08:00:00Z',
    kwh_consumed: 12,
    total_cost: 300,
    peak_demand: 6,
    power_factor: 0.82,
    voltage: 240,
    current: 6,
    frequency: 50
  },
  {
    id: '4',
    user_id: 'user1',
    meter_number: 'meter1',
    reading_date: '2023-01-04T08:00:00Z',
    kwh_consumed: 18,
    total_cost: 450,
    peak_demand: 9,
    power_factor: 0.88,
    voltage: 240,
    current: 9,
    frequency: 50
  },
  {
    id: '5',
    user_id: 'user1',
    meter_number: 'meter1',
    reading_date: '2023-01-05T08:00:00Z',
    kwh_consumed: 14,
    total_cost: 350,
    peak_demand: 7,
    power_factor: 0.83,
    voltage: 240,
    current: 7,
    frequency: 50
  },
  {
    id: '6',
    user_id: 'user1',
    meter_number: 'meter1',
    reading_date: '2023-01-06T08:00:00Z',
    kwh_consumed: 16,
    total_cost: 400,
    peak_demand: 8,
    power_factor: 0.86,
    voltage: 240,
    current: 8,
    frequency: 50
  },
  {
    id: '7',
    user_id: 'user1',
    meter_number: 'meter1',
    reading_date: '2023-01-07T08:00:00Z',
    kwh_consumed: 13,
    total_cost: 325,
    peak_demand: 6,
    power_factor: 0.81,
    voltage: 240,
    current: 6,
    frequency: 50
  }
];

// Test the ML insights generation
async function testMLInsights() {
  try {
    console.log('Testing ML Insights generation...');
    console.log('Test data:', testData);
    
    const insights = await generateMLInsights('household', undefined, testData);
    
    console.log('\nGenerated ML Insights:');
    console.log('=====================');
    insights.forEach((insight, index) => {
      console.log(`${index + 1}. ${insight.title}`);
      console.log(`   Description: ${insight.description}`);
      console.log(`   Confidence: ${insight.confidence}%`);
      console.log(`   Model: ${insight.mlModel}`);
      if (insight.recommendation) {
        console.log(`   Recommendation: ${insight.recommendation}`);
      }
      console.log('');
    });
    
    console.log(`Total insights generated: ${insights.length}`);
  } catch (error) {
    console.error('Error testing ML insights:', error);
  }
}

// Run the test
testMLInsights();
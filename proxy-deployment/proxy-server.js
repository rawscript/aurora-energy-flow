const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration from environment variables or defaults
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

// Configure CORS to allow requests from common deployment domains
// Using a custom function for origin verification to handle wildcards properly
const corsOptions = {
  origin: function (origin, callback) {
    // List of allowed origins (including wildcard patterns)
    const allowedOrigins = [
      'https://aurora-smart-meter.onrender.com',
      'https://smart-simulator.netlify.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check Netlify wildcard pattern
    if (origin.endsWith('.netlify.app')) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log(`CORS Debug - Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increase payload limit

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Handle GET requests to the proxy endpoint with a helpful message
app.get('/proxy/supabase-function', (req, res) => {
  res.json({ 
    message: 'This endpoint only accepts POST requests',
    usage: 'POST to this endpoint with a JSON body containing the data to send to Supabase',
    example: {
      meter_number: 'KP-123456',
      kwh_consumed: 15.75,
      user_id: 'user-uuid',
      cost_per_kwh: 25.0
    }
  });
});

// Proxy endpoint for Supabase functions - UPDATED FOR SMART METER DATA FLOW
app.post('/proxy/supabase-function', async (req, res) => {
  try {
    // Get the data from the request body
    const payload = req.body;
    
    console.log('Proxying smart meter data to Supabase function:', JSON.stringify(payload, null, 2));
    
    // Call the smart-meter-webhook function directly
    const webhookUrl = `https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/smart-meter-webhook`;
    
    // Forward the request to the smart-meter-webhook function
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    console.log(`Supabase webhook response status: ${response.status}`);
    
    // Forward the response back to the client
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Proxy server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Aurora Smart Meter Proxy Server',
    description: 'This proxy server handles CORS issues between the smart meter simulator and Supabase',
    endpoints: {
      health: '/health',
      proxy: '/proxy/supabase-function',
      docs: '/'
    },
    usage: 'POST to /proxy/supabase-function with smart meter data to send it to Supabase'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Health check endpoint: http://localhost:${PORT}/health`);
  console.log(`Proxy endpoint: http://localhost:${PORT}/proxy/supabase-function`);
  console.log(`Server is ready to handle requests`);
});
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration from environment variables or defaults
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

// Configure CORS to allow requests from common deployment domains
const corsOptions = {
  origin: [
    'https://aurora-smart-meter.onrender.com',
    'https://*.netlify.app',
    'https://*.vercel.app',
    'https://*.herokuapp.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Handle GET requests to the proxy endpoint with a helpful message
app.get('/proxy/supabase-function', (req, res) => {
  res.json({ 
    message: 'This endpoint only accepts POST requests',
    usage: 'POST to this endpoint with a JSON body containing { url, ...otherData }',
    example: {
      url: 'https://your-supabase-project.supabase.co/functions/v1/your-function',
      user_id: 'user123',
      meter_number: 'meter456',
      kwh_consumed: 10.5
    }
  });
});

// Proxy endpoint for Supabase functions
app.post('/proxy/supabase-function', async (req, res) => {
  try {
    const { url, ...body } = req.body;
    
    console.log(`Proxying request to: ${url}`);
    
    // Validate URL is from Supabase
    if (!url || !url.includes('.supabase.co/functions/v1/')) {
      console.warn(`Invalid Supabase URL attempted: ${url}`);
      return res.status(400).json({ error: 'Invalid Supabase function URL' });
    }
    
    // Forward the request to Supabase
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    console.log(`Supabase response status: ${response.status}`);
    
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
    usage: 'POST to /proxy/supabase-function with { url, ...data } to proxy requests to Supabase'
  });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Health check endpoint: http://localhost:${PORT}/health`);
  console.log(`Proxy endpoint: http://localhost:${PORT}/proxy/supabase-function`);
  console.log(`Server is ready to handle requests`);
});
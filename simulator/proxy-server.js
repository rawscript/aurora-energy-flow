const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
// Use the PORT environment variable or default to 3001
const PORT = process.env.PORT || 3001;

// Supabase configuration from environment variables or defaults
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

// Configure CORS to allow requests from common deployment domains
const corsOptions = {
  origin: [
    'https://aurora-smart-meter.onrender.com',
    'https://smart-simulator.netlify.app', // Add your Netlify domain
    'https://*.netlify.app',
    'https://*.vercel.app',
    'https://*.herokuapp.com'
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
      url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/your-function',
      user_id: 'user123',
      meter_number: 'meter456',
      kwh_consumed: 10.5
    }
  });
});

// Proxy endpoint for Supabase functions
app.post('/proxy/supabase-function', async (req, res) => {
  try {
    console.log('=== NEW REQUEST RECEIVED ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { url, ...body } = req.body;
    
    // Log the incoming request for debugging
    console.log(`Proxying smart meter data to Supabase function:`, JSON.stringify(body, null, 2));
    
    // Validate URL is from Supabase
    if (!url || !url.includes('.supabase.co/functions/v1/')) {
      console.warn(`Invalid Supabase URL attempted: ${url}`);
      return res.status(400).json({ error: 'Invalid Supabase function URL' });
    }
    
    // Forward the request to Supabase
    console.log('Sending request to Supabase...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(body)
    });
    
    console.log(`Supabase webhook response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`Supabase webhook response body:`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`Parsed Supabase response:`, JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.log('Could not parse Supabase response as JSON:', responseText);
      data = { rawResponse: responseText };
    }
    
    // Forward the response back to the client
    console.log(`Forwarding response with status ${response.status} to client`);
    res.status(response.status).json(data);
    console.log('=== REQUEST HANDLED ===');
  } catch (error) {
    console.error('=== PROXY ERROR ===');
    console.error('Proxy error:', error);
    console.error('Proxy error stack:', error.stack);
    console.error('=== END PROXY ERROR ===');
    res.status(500).json({ 
      error: 'Proxy request failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
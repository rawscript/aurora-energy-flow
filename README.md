# Aurora Energy
Aurora Energy – AI-Powered Energy Optimization for Kenya

Aurora Energy is an AI-based energy management platform that optimizes electricity consumption in Kenya through secure smart meter API integration and advanced data analytics. The system's technical contributions include automated energy bill forecasting using dynamic tariff algorithms, USSD/SMS interfaces for universal accessibility across mobile platforms, and behavioral modification through AI-generated efficiency recommendations. By processing real-time consumption patterns, the platform identifies peak-hour overuse and equipment anomalies while providing actionable conservation strategies. Initial implementations demonstrate 20-30% reduction in household energy expenditures, with particular effectiveness in budget-constrained environments. The architecture's compatibility with existing utility infrastructure enables rapid deployment across Kenya's 7.5 million grid-connected users without requiring additional hardware. Furthermore, the solution supports national energy policy objectives by contributing to grid load balancing and emission reduction targets. Future development will focus on machine learning optimization for predictive consumption modeling and potential integration with distributed renewable energy systems.

## Smart Meter Simulator

This repository includes a smart meter simulator that can be deployed to test the Aurora Energy system. The simulator is located in the [simulator](simulator) directory and includes:

- A web-based smart meter interface ([smart-meter.html](simulator/smart-meter.html))
- A proxy server ([proxy-server.js](simulator/proxy-server.js)) to handle CORS issues
- Deployment scripts and documentation

For detailed deployment instructions, see:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for overall deployment instructions
- [simulator/README.md](simulator/README.md) for simulator-specific information
- [simulator/SMART_METER_DEPLOYMENT.md](simulator/SMART_METER_DEPLOYMENT.md) for smart meter deployment
- [simulator/PROXY_DEPLOYMENT.md](simulator/PROXY_DEPLOYMENT.md) for proxy server deployment

## Proxy Server Deployment

A separate directory [proxy-deployment](proxy-deployment) contains all the necessary files for deploying just the proxy server. This is useful when you want to deploy the proxy server independently of the simulator.

The proxy-deployment directory includes:
- [package.json](proxy-deployment/package.json) - Node.js package file with dependencies
- [proxy-server.js](proxy-deployment/proxy-server.js) - Main proxy server implementation
- [README.md](proxy-deployment/README.md) - Deployment instructions
- Startup scripts for both Unix and Windows

## Testing the Proxy Server

After deploying the proxy server, you should test it to ensure it's working correctly:

1. Update [test-proxy-endpoint.js](test-proxy-endpoint.js) with your deployed proxy server URL
2. Run `node test-proxy-endpoint.js` to test the endpoints
3. See [TESTING_PROXY.md](TESTING_PROXY.md) for detailed testing instructions

Once you've confirmed the proxy server is working, update the proxyUrl in your smart-meter.html file to point to your deployed proxy server.
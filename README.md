# Aurora Energy Platform

**Aurora Energy** is an enterprise-grade, AI-powered energy management and optimization platform. Designed for scalability and resilience, it provides real-time energy monitoring, predictive analytics, conversational AI assistance, and automated billing features for residential and commercial deployments across Kenya.

## Current Status (April 2026)

| Subsystem | Status | Notes |
|---|---|---|
| IoT Telemetry (MQTT) | Production | HiveMQ Cloud, ESP8266 smart meters |
| React Dashboard | Production | Vite + TypeScript, Vercel hosted |
| Supabase Backend | Production | PostgreSQL 15, RLS, Edge Functions |
| AI Chatbot (NVIDIA Nemo) | Active | `minimaxai/minimax-m2.7` via `EnhancedAIService.ts` |
| Notification System | Active | Real-time Supabase WebSocket, unblocked |
| Prophet Forecasting | Active | Client-side linear regression |
| Sentinel Anomaly Detection | Active | Client-side Z-score thresholding |
| SMS / USSD | Planned | Africa's Talking integration pending |
| Simulator / Proxy | Deprecated | See `simulator/`, `proxy-deployment/` |

## Key Capabilities

- **Real-Time IoT Telemetry:** MQTT integration with HiveMQ Cloud supporting ESP8266/ESP32 smart meter nodes with sub-200ms latency UI rendering via `useMqtt.ts`.
- **AI Chatbot:** Floating assistant widget (`Chatbot.tsx`) powered by NVIDIA Nemo Microservices (`minimaxai/minimax-m2.7`), with automatic fallback to Gemini and local TF.js models.
- **AI-Driven Analytics:** Client-side Prophet forecasting and Sentinel anomaly detection running directly in-browser without server round-trips.
- **Enterprise Dashboard:** Built with React 18, Recharts, and Three.js for premium data visualization.
- **Real-Time Notifications:** Supabase WebSocket channel subscription delivering live alerts with unread badge counts.
- **Universal Accessibility:** USSD and SMS infrastructure (Africa's Talking integration planned).

## Architecture

```
[ESP8266 Smart Meter]
        |
   MQTT (MQTTS 8883)
        |
  [HiveMQ Cloud Broker]
     /          \
    /            \
[useMqtt.ts]   [scripts/mqtt_bridge.js]
(Client UI)    (Node.js backend bridge)
                    |
           [Supabase PostgreSQL]
           insert_energy_reading_improved()
                    |
            [React Dashboard]
            useRealTimeEnergy.ts
```

- **Frontend:** React 18, TypeScript (strict), Vite, Tailwind CSS, Recharts, Three.js
- **Backend / Data Layer:** Supabase (PostgreSQL 15, PostgREST, Edge Functions, Realtime WebSockets)
- **IoT Messaging:** HiveMQ Cloud (MQTTS `broker.s1.eu.hivemq.cloud:8883`)
- **AI Chatbot:** NVIDIA Nemo API (`integrate.api.nvidia.com`) — model: `minimaxai/minimax-m2.7`
- **Deployment:** Vercel Edge Network (Frontend), Supabase Cloud (Backend)

For deeper architectural details, hardware integration schemas, AI/ML infrastructure, and data dictionary documentation, refer to the `docs/` directory.

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/aurora-energy/aurora-energy-flow.git
   cd aurora-energy-flow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup** — create `.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_service_role_key

   # HiveMQ Cloud MQTT
   MQTT_URL=tls://your-broker.hivemq.cloud:8883
   MQTT_USERNAME=your_username
   MQTT_PASSWORD=your_password
   VITE_MQTT_USERNAME=your_username
   VITE_MQTT_PASSWORD=your_password

   # NVIDIA Nemo AI (optional — chatbot falls back gracefully)
   VITE_NVIDIA_NEMO_URL=https://integrate.api.nvidia.com/v1/chat/completions
   VITE_NVIDIA_NEMO_API_KEY=your_nemo_api_key
   VITE_NVIDIA_NEMO_MODEL=minimaxai/minimax-m2.7
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Start the MQTT Bridge** (separate terminal, requires Node.js):
   ```bash
   node scripts/mqtt_bridge.js
   ```

## Documentation

| Resource | Location |
|---|---|
| System Architecture | `docs/system_architecture.md` |
| API Reference | `docs/api_reference.md` |
| Hardware Integration | `docs/hardware_integration.md` |
| Data Schemas | `docs/data_schemas.md` |
| User Help Center | `/documentation` (live app) |
| SLA | `/sla` (live app) |
| Privacy | `/privacy` (live app) |

## Legacy Infrastructure

The `simulator/`, `smart-meter/`, and `proxy-deployment/` directories contain early prototyping artifacts and are no longer part of the active production architecture. Do not reference these for modern integration work.

## License

This project is proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

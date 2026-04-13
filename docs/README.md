# Aurora Platform - Internal Documentation

This directory contains consolidated internal backend and operational documentation for the Aurora Energy Flow project. All files here are intended for engineers and are **not** exposed via the live web application.

For user-facing guides (Understanding the Dashboard, AI Forecasting, Alerts, USSD), navigate to `/documentation` in the running app.

---

## Architecture Overview

Aurora Energy Flow operates on a highly available, decoupled modern stack:

### Layer 1: Edge and Presentation (Frontend)
- **Framework**: React 18 + Vite
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS, `clsx`, `tailwind-merge`
- **Visualizations**: Recharts, Three.js
- **Hosting**: Vercel Edge Network

### Layer 2: Core API and Data Layer (Backend)
- **Provider**: Supabase
- **Database**: PostgreSQL 15+
- **APIs**: PostgREST endpoints and Edge Functions (Deno)
- **Real-Time**: Supabase Realtime Channels (WebSockets) — live notification delivery
- **Auth**: Supabase Auth (JWT, RBAC, Row Level Security)

### Layer 3: IoT Ingestion and Hardware
- **Broker**: HiveMQ Cloud (`broker.s1.eu.hivemq.cloud:8883`, MQTTS)
- **Bridge**: Node.js subscriber `scripts/mqtt_bridge.js` — maps meter IDs to user UUIDs and calls Supabase RPC
- **Firmware**: MicroPython on ESP8266 devices (`firmware.py`) — samples ACS712 current sensor, computes RMS, publishes to MQTT

### Layer 4: AI and Intelligence
- **Conversational AI**: NVIDIA Nemo Microservices (`minimaxai/minimax-m2.7`) via `src/services/EnhancedAIService.ts`
  - Fallback chain: NVIDIA Nemo → Gemini (`gemini-2.0-flash`) → Hugging Face → Local TF.js
  - Rendered as a persistent floating widget (`src/components/Chatbot.tsx`) across all dashboard tabs
- **Prophet Forecasting**: Client-side linear regression + seasonal wave, rendered via Recharts `ComposedChart` (`src/components/DeepDiveAnalysis.tsx`)
- **Sentinel Anomaly Detection**: Client-side Z-score thresholding (`zScore > 1.8`) on live `kwh_consumed` readings

---

## Document Index

| Document | Description |
|---|---|
| `api_reference.md` | MQTT topic schema, payload specification, Supabase RPC interface |
| `hardware_integration.md` | ESP8266 firmware architecture, ACS712 sensor wiring, RMS calculation |
| `system_architecture.md` | Prophet and Sentinel AI model technical documentation, MQTT bridge pattern |
| `data_schemas.md` | Supabase table structures, RLS policies, data ingestion flow |

---

## Environment Variables Reference

| Variable | Layer | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Public anon key for client-side queries |
| `SUPABASE_SERVICE_KEY` | Bridge | Service role key (bypasses RLS in `mqtt_bridge.js`) |
| `MQTT_URL` | Bridge | Full HiveMQ broker URL including protocol and port |
| `MQTT_USERNAME` | Bridge | MQTT broker auth username |
| `MQTT_PASSWORD` | Bridge | MQTT broker auth password |
| `VITE_MQTT_USERNAME` | Frontend | MQTT WebSocket auth username for `useMqtt.ts` |
| `VITE_MQTT_PASSWORD` | Frontend | MQTT WebSocket auth password |
| `VITE_NVIDIA_NEMO_URL` | Frontend | NVIDIA Nemo API endpoint |
| `VITE_NVIDIA_NEMO_API_KEY` | Frontend | NVIDIA Nemo bearer token |
| `VITE_NVIDIA_NEMO_MODEL` | Frontend | Nemo model ID (currently `minimaxai/minimax-m2.7`) |

---

## Legacy Folders

The `simulator/`, `proxy-deployment/`, and `smart-meter/` folders contain older iterations of the project when a web-based simulator was used for mock data generation. They are preserved for historical context only and are not referenced or maintained in the current production build.
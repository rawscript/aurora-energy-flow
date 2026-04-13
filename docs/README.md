# Aurora Platform - Internal Documentation

This directory contains consolidated internal backend and operational documentation for the Aurora Energy Flow project.

## Architecture & Infrastructure

Aurora Energy Flow operates on a highly available, decoupled modern stack:

### Layer 1: Edge & Presentation (Frontend)
- **Framework**: React 18 + Vite
- **Language**: TypeScript (`strict` mode)
- **Styling**: Tailwind CSS, `clsx`, `tailwind-merge`
- **Visualizations**: D3 / Recharts / Three.js
- **Hosting**: Vercel Edge Network

### Layer 2: Core API & Data Layer (Backend)
- **Provider**: Supabase 
- **Database**: PostgreSQL 15+
- **APIs**: PostgREST endpoints + Edge Functions (Deno)
- **Real-Time**: Supabase Realtime Channels (WebSockets)
- **Auth**: Supabase Auth (JWT, RBAC)

### Layer 3: IoT Ingestion & Hardware
- **Bridge**: External MQTT Broker (Node MQTT proxy `scripts/mqtt_bridge.js`)
- **Firmware**: MicroPython/C++ on ESP8266/ESP32 devices (`firmware.py`)
- **Protocol**: Raw MQTT telemetry mapping mapped into the `energy_readings` table

## Live Web Documentation

For non-technical, user-facing guides (Understanding the Dashboard, USSD, Alerts, AI Forecasts), please start the app and navigate to the integrated User Guide at `/documentation` and `/guide/*`.

Internal engineering architecture constraints and API structures are documented natively within this `docs/` repository directly.

## Directory Structure

```text
src/
├── components/     # High-fidelity UI components & layout elements
├── contexts/       # Application state (MeterContext, AuthContext)
├── hooks/          # Complex logic (useRealTimeEnergy, useMQTT)
├── integrations/   # Supabase typings and init logic
├── pages/          # App routes, landing pages, and documentation pages
├── ...
```

## Legacy Folders Warning

Folders such as `simulator`, `proxy-deployment`, and `smart-meter` represent older iterations of the project when a mock web-simulator was used for generating data. They are preserved for historical context but are no longer maintained as part of the production Aurora Platform architecture. For modern IoT testing, direct MQTT integration is required.
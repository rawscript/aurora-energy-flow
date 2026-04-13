# System Architecture and AI Integration

The Aurora platform uses a four-layer architecture: edge hardware collecting raw telemetry, an MQTT messaging layer for high-throughput transport, a Supabase data layer for persistence and real-time delivery, and a React frontend that runs AI analytics entirely client-side for sub-second responsiveness.

---

## AI Subsystem Overview

As of April 2026, the Aurora platform ships three distinct AI capabilities:

| Model | Location | Technology |
|---|---|---|
| **Aurora Assistant** (Chatbot) | `src/components/Chatbot.tsx` | NVIDIA Nemo API — `minimaxai/minimax-m2.7` |
| **Prophet** (Forecasting) | `src/components/DeepDiveAnalysis.tsx` | Client-side Linear Regression + Seasonality |
| **Sentinel** (Anomaly Detection) | `src/components/DeepDiveAnalysis.tsx` | Client-side Z-Score Thresholding |

---

## Aurora Assistant: NVIDIA Nemo Integration

The conversational assistant is a floating widget (`Chatbot.tsx`) rendered persistently across all dashboard tabs. It routes user queries to NVIDIA's Nemo Microservices API using an OpenAI-compatible REST interface.

### Request Structure
```typescript
POST https://integrate.api.nvidia.com/v1/chat/completions
Authorization: Bearer {VITE_NVIDIA_NEMO_API_KEY}
Content-Type: application/json

{
  "model": "minimaxai/minimax-m2.7",
  "messages": [
    { "role": "system", "content": "You are Aurora, a smart energy assistant..." },
    { "role": "user",   "content": "{userMessage}" }
  ],
  "temperature": 0.2,
  "top_p": 0.7,
  "max_tokens": 1024
}
```

### Fallback Chain (`src/services/EnhancedAIService.ts`)
If the primary API is unavailable, the service automatically degrades:
1. **NVIDIA Nemo** (`VITE_NVIDIA_NEMO_API_KEY` present) — primary
2. **Google Gemini** (`VITE_GEMINI_API_KEY` present) — secondary fallback
3. **Hugging Face** (`VITE_HUGGINGFACE_API_KEY` present) — tertiary fallback
4. **Local TF.js pattern matching** — offline mode, always available

Responses are cached in-memory for 5 minutes per query key to reduce API call frequency.

---

## Prophet: Time-Series Forecasting

Prophet executes natively in the browser without server round-trips using data pulled from the `useRealTimeEnergy` hook.

### Algorithm Steps
1. Historical `kwh_consumed` readings are sorted chronologically.
2. A **Linear Regression Line** `m(x)` is computed across the `n` historical readings using the `simple-statistics` library.
3. A seasonal wave is overlaid on future timestamps: `seasonality = Math.sin(futureX * Math.PI / 4) * (stdDev * 0.5)`
4. The predicted value is: `predicted = m(futureX) + seasonality`
5. Confidence interval bounds expand linearly over the 6-hour forecast window: `confidenceMargin = (stdDev * 0.5) + (i * stdDev * 0.15)`

### Visualization
Rendered via Recharts `ComposedChart` with:
- Green solid line: actual historical readings
- Purple dashed line: forecast trend
- Shaded purple band: upper and lower confidence bounds

---

## Sentinel: Anomaly Detection

Sentinel operates on the same live readings to flag statistically unusual consumption events.

### Algorithm Steps
1. Mean and Standard Deviation are computed across all current `kwh_consumed` values.
2. Each reading receives a Z-score: `zScore = Math.abs((value - mean) / stdDev)`
3. Readings exceeding the threshold `zScore > 1.8` are flagged as anomalous vectors.
4. Anomalies are rendered as red scatter points overlaid on the usage line chart.

---

## Data Subsystems: MQTT Bridge Pattern

To keep the frontend highly responsive while persisting telemetry long-term:

### Node.js MQTT Bridge (`scripts/mqtt_bridge.js`)
- Subscribes to `aurora/meters/+/data` on HiveMQ Cloud using MQTTS over port 8883.
- Resolves each `meter_id` to a Supabase user UUID via the `profiles` table.
- Calls `insert_energy_reading_improved()` PostgreSQL RPC using the Supabase Service Role Key (bypasses RLS).
- Runs as a standalone persistent process separate from the frontend dev server.

### WebSocket Direct Feed (`src/hooks/useMqtt.ts`)
- The React UI connects directly to HiveMQ's WebSocket endpoint.
- Completely bypasses Supabase for rendering live wattage, voltage, and current on the dashboard.
- Achieved latency: sub-200ms from meter publish to UI render.

---

## Notification System

The `useNotifications.ts` hook subscribes to the `notifications` Supabase table via `postgres_changes` WebSocket events. As of April 2026, the hook has been unblocked with reduced throttling:

| Parameter | Previous | Current |
|---|---|---|
| `API_CALL_DEBOUNCE` | 5000ms | 500ms |
| `MIN_REFRESH_INTERVAL` | 30000ms | 2000ms |
| `UPDATE_THROTTLE` | 3000ms | 500ms |
| `MAX_CONCURRENT_REQUESTS` | 2 | 5 |

All `postgres_changes` events are logged with structured prefixes (`[useNotifications]`) for observability.

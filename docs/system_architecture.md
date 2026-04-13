# System Architecture & AI Integration

The Aurora platform uses a dual-pronged architecture: real-time telemetry processing via HiveMQ and analytical intelligence mapping visualized directly within the client dashboard application using the Prophet and Sentinel models.

## Deep Dive: The Prophet Model

**Prophet** acts as the time-series forecasting model within Aurora, analyzing historical energy `kwh_consumed` mappings to generate bounded confidence intervals (predicted boundaries) for future consumption.
Within the dashboard's `DeepDiveAnalysis.tsx`, the Prophet engine maps historical trends to produce future upper-bound vectors. By understanding a user's peak power pull across days, the model simulates forward-looking consumption bands (displayed dynamically on the UI via `ComposedChart`), helping end-users estimate expected costs and proactively adjust usage.

## Deep Dive: The Sentinel Model

**Sentinel** represents the platform's proprietary Anomaly Detection layer. While the raw MQTT stream simply dictates current and voltage, Sentinel analyzes the stream's derivative to identify sudden structural shifts in consumption patterns.
When activated inside the Deep Dive interface, the Sentinel pipeline compares incoming wattages against the established mathematical baseline. If an appliance undergoes fatigue or a user deviates drastically from their norm, Sentinel flags these as discrete "Anomaly" vectors on the data map. This translates in the application to specific, timestamped alerts (e.g., *“Sentinel detected 3 anomalous usage points”*), allowing users to quickly troubleshoot malfunctioning appliances or unauthorized consumption taps.

## Data Subsystems (Bridge Pattern)

To keep the frontend highly responsive while accommodating intensive ML reads:
1. **MQTT Node.js Bridge**: `scripts/mqtt_bridge.js` silently subscribes to the broker using an enterprise auth profile, transcribing high-volume MQTTS traffic to heavy, long-term PostgreSQL rows.
2. **WebSockets Direct**: The React UI uses secure WebSocket connections directly to the HiveMQ broker (`useMqtt.ts`), completely bypassing Supabase for visual meter rendering. This yields a sub-200ms latency stream independent of database performance.

# System Architecture & AI Integration

The Aurora platform uses a dual-pronged architecture: real-time telemetry processing via HiveMQ and analytical intelligence mapping visualized directly within the client dashboard application using the Prophet and Sentinel models.

## Deep Dive: The Prophet Model

**Prophet** acts as the time-series forecasting model within Aurora. On the dashboard interface (`DeepDiveAnalysis.tsx`), it executes natively in the browser without requiring round-trips to the server.
1. The engine calculates a **Linear Regression Line** (`m(x)`) across all chronologically reversed historical real-time readings.
2. It then adds a simulated seasonal wave factor using the baseline Standard Deviation (`Math.sin(futureX * Math.PI / 4) * (stdDev * 0.5)`).
3. The Confidence Interval constraints (upper and lower bounds) dynamically grow outward for future timestamps mapping to `(stdDev * 0.5) + (i * stdDev * 0.15)`.

This creates a highly responsive, mathematically sound forecast path overlaid via Recharts `ComposedChart` helping end-users estimate expected expected future pull.

## Deep Dive: The Sentinel Model

**Sentinel** represents the platform's proprietary Anomaly Detection layer. Rather than bulky neural networks, Sentinel prioritizes latency by utilizing a mathematical **Z-Score Thresholding** approach to mock Isolation Forest spatial mapping.
1. Raw `kwh_consumed` metrics are gathered to calculate a mathematical `Mean` and `Standard Deviation`.
2. Each new telemetry reading undergoes a spatial check: `zScore = Math.abs((value - mean) / stdDev)`.
3. If an anomaly threshold is breached (`zScore > 1.8`), the reading is tagged natively as an anomalous vector.

This translates in the application to specific, timestamped scatter points (e.g., *“Sentinel detected 3 anomalous usage points”*), allowing users to quickly troubleshoot malfunctioning appliances or unauthorized consumption taps immediately.

## Data Subsystems (Bridge Pattern)

To keep the frontend highly responsive while accommodating intensive ML reads:
1. **MQTT Node.js Bridge**: `scripts/mqtt_bridge.js` silently subscribes to the broker using an enterprise auth profile, transcribing high-volume MQTTS traffic to heavy, long-term PostgreSQL rows.
2. **WebSockets Direct**: The React UI uses secure WebSocket connections directly to the HiveMQ broker (`useMqtt.ts`), completely bypassing Supabase for visual meter rendering. This yields a sub-200ms latency stream independent of database performance.

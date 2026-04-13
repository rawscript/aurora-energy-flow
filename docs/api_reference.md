# Aurora API Reference

The Aurora Energy telemetry ingestion pipeline does not rely on traditional REST POST requests for live data. Instead, it utilizes high-throughput MQTT messaging over WebSockets and secure TCP.

## Telemetry Ingestion (MQTT)

Smart meters and cloud clients communicate via HiveMQ Cloud. The integration uses the following configuration:
- **Broker**: `50a08402532e40caaee237591bf35b7e.s1.eu.hivemq.cloud`
- **Port**: `8883` (MQTTS)
- **Topic Structure**: `aurora/meters/{meter_id}/data`
- **Status Topic**: `aurora/meters/{meter_id}/status`

### Payload Specification
Meters must publish JSON payloads to the data topic in the following format:
```json
{
  "meter_id": "44106278820",
  "device_name": "Aurora Smart Meter v1.0",
  "readings": {
    "voltage_rms": 230.5,
    "current_rms": 2.4,
    "power": 553.2
  },
  "status": {
    "online": true
  },
  "metadata": {
    "wifi_rssi": -65,
    "uptime": 3600
  }
}
```

## Cloud Bridge & Supabase Insertion

To persist data efficiently while respecting Row Level Security (RLS), a Node.js companion proxy (`scripts/mqtt_bridge.js`) acts as a secure backend consumer. 
The bridge uses the Supabase Service Role Key to bypass RLS, maps the incoming `meter_id` to actual user profile UUIDs, and utilizes a custom PostgreSQL remote procedure call (RPC) `insert_energy_reading_improved` to ingest the record securely.

```sql
SELECT insert_energy_reading_improved(
  p_user_id := uuid,
  p_meter_number := text,
  p_kwh_consumed := float,
  p_cost_per_kwh := float
)
```

## Front-End Subscription
Clients track live data by tapping directly into the HiveMQ WebSocket service utilizing the `useMqtt` React Hook. 
This bypasses backend database polling entirely, yielding sub-second latency for UI dashboard visualization.

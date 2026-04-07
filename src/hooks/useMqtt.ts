import { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import { useMeter } from '../contexts/MeterContext';

interface MqttData {
  meter_id: string;
  device_name: string;
  readings: {
    voltage_rms: number;
    current_usage: number;
    power: number;
    energy?: number;
  };
  status: {
    online: boolean;
  };
  metadata: {
    wifi_rssi: number;
    uptime: number;
  };
}

export const useMqtt = () => {
  const { meterNumber } = useMeter();
  const [latestData, setLatestData] = useState<MqttData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  useEffect(() => {
    if (!meterNumber) {
      if (clientRef.current) {
        clientRef.current.end();
        clientRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const clusterUrl = '50a08402532e40caaee237591bf35b7e.s1.eu.hivemq.cloud';
    const brokerUrl = `wss://${clusterUrl}:8884/mqtt`;
    const topic = `aurora/meters/${meterNumber}/data`;

    console.log(`[MQTT] Connecting to ${brokerUrl} for meter: ${meterNumber}`);

    const options: mqtt.IClientOptions = {
        // Use environment variables for credentials
        username: import.meta.env.VITE_MQTT_USERNAME || 'aurora_device', 
        password: import.meta.env.VITE_MQTT_PASSWORD || 'AuroraR12#',
        clientId: `aurora_web_${Math.random().toString(16).slice(2, 10)}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
    };

    const client = mqtt.connect(brokerUrl, options);
    clientRef.current = client;

    client.on('connect', () => {
      console.log('[MQTT] Connected successfully to HiveMQ');
      setIsConnected(true);
      setError(null);
      
      // Subscribe to this specific meter's data
      client.subscribe(topic, (err) => {
        if (err) {
          console.error('[MQTT] Subscription Error:', err);
          setError('Failed to subscribe to meter data');
        } else {
          console.log(`[MQTT] Subscribed to meter: ${meterNumber}`);
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        // Map the payload if necessary to match MqttData interface
        // The firmware sends { readings: { voltage_rms, current_rms, power } }
        const mappedData: MqttData = {
            ...payload,
            readings: {
                ...payload.readings,
                current_usage: payload.readings.current_rms // Mapping for UI consistency
            }
        };
        setLatestData(mappedData);
      } catch (e) {
        console.error('Failed to parse MQTT message:', e);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT Connection Error:', err);
      setError(err.message);
      setIsConnected(false);
    });

    client.on('close', () => {
      console.log('MQTT Connection Closed');
      setIsConnected(false);
    });

    return () => {
      if (clientRef.current) {
        console.log('Cleaning up MQTT connection');
        clientRef.current.end();
        clientRef.current = null;
      }
    };
  }, [meterNumber]);

  return {
    latestData,
    isConnected,
    error,
    meterNumber
  };
};

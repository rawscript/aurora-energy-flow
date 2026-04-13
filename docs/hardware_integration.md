# Hardware Integration

Aurora's edge devices are primarily based on low-cost, high-efficiency microcontrollers running native C++ firmware (`firmware.py` / `.cpp`). The reference hardware stack utilizes the ESP8266 NodeMCU framework.

## Components & Wiring

The reference smart meter integrates the following components:
- **MCU**: ESP8266 NodeMCU
- **Current Sensor**: ACS712 (connected via A0, running with `ACS_OFFSET = 2.50V` and sensitivity `0.100V/A`)
- **Status Indicators**:
    - `LED_GREEN` (GPIO14/D5): System and WiFi connectivity status
    - `LED_WHITE` (GPIO12/D6): Pulse indicator for sampling activity.

*Note on Voltage*: In the continuous MVP iteration, grid voltage is simulated as a time-varying sine wave based on a constant 230V reference, avoiding direct mains exposure during laboratory benchmarking.

## Firmware Data Loop

The device maintains a secure TLS connection via `WiFiClientSecure` to HiveMQ Cloud.
Data is read via an intensive 300-sample RMS calculation loop:
```cpp
for (int i = 0; i < SAMPLE_COUNT; i++) {
  float voltage = (float)analogRead(A0) * ADC_REF_VOLT / ADC_MAX_COUNTS;
  float current = (voltage - ACS_OFFSET) / ACS_SENS;
  sumSq += (double)(current * current);
  delayMicroseconds(200);
}
```

Publishing occurs every 5 seconds (to adhere to optimal MQTT pub/sub traffic flows) formatted strictly into the required JSON payload. The meter implements Last Will and Testament (LWT) by registering an `offline` payload on its status topic during the connection handshake.

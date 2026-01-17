# Aurora Smart Meter

ESP8266-based smart meter that communicates with Aurora's backend system.

## Features

- **Hardcoded Meter ID**: `4410627882` for unique identification
- **Real-time Measurements**: Voltage, Current, Power, Energy, Temperature
- **WiFi Connectivity**: Automatic connection to Aurora backend
- **LCD Display**: Shows measurements and connection status
- **LED Indicators**: 
  - Green: System/WiFi connected
  - Blue: Measurement activity
  - Red: Connection failure/error
- **Automatic Data Upload**: Sends data every 30 seconds

## Hardware Requirements

- ESP8266 NodeMCU or similar
- ADS1115 16-bit ADC
- ZMPT101B voltage sensor
- ACS712 current sensor
- LM35 temperature sensor
- 16x2 I2C LCD display
- LEDs (Green, Blue, Red)
- Resistors and wiring

## Wiring Diagram

```
ESP8266 -> Components:
D5 -> Green LED (through resistor)
D6 -> Blue LED (through resistor)  
D7 -> Red LED (through resistor)
SDA -> ADS1115 SDA, LCD SDA
SCL -> ADS1115 SCL, LCD SCL
3V3 -> ADS1115 VCC, LCD VCC
GND -> ADS1115 GND, LCD GND, LED grounds

ADS1115 Channels:
A0 -> ACS712 current sensor
A1 -> ZMPT101B voltage sensor  
A2 -> LM35 temperature sensor
```

## Setup Instructions

1. **Install Arduino IDE** with ESP8266 board support
2. **Install Required Libraries**:
   - Adafruit ADS1X15
   - LiquidCrystal I2C
   - ArduinoJson
   - ESP8266WiFi
   - ESP8266HTTPClient

3. **Configure Network Settings**:
   Edit these lines in the code:
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const String BACKEND_URL = "https://your-aurora-backend.com/api/smart-meter/data";
   ```

4. **Calibrate Sensors**:
   Adjust these values based on your hardware:
   ```cpp
   #define ACS_OFFSET   2.50      // Volts at zero current
   #define ACS_SENS     0.100     // V/A sensitivity
   #define ZMPT_CAL     250.0     // Voltage scaling factor
   ```

5. **Upload Code** to ESP8266

## Backend API Expectation

The smart meter sends POST requests to your backend with this JSON format:

```json
{
  "meter_id": "SM-001-AURORA",
  "device_name": "Aurora Smart Meter v1.0",
  "timestamp": 1234567890,
  "readings": {
    "voltage_rms": 230.5,
    "current_rms": 2.15,
    "power": 495.58,
    "energy": 12.5,
    "temperature": 28.3
  },
  "metadata": {
    "wifi_rssi": -65,
    "uptime_ms": 3600000
  }
}
```

## Expected Backend Response

Your Aurora backend should accept POST requests at `/api/smart-meter/data` and respond with:
- HTTP 200 for successful processing
- Error codes for failures (will trigger retry logic)

## Troubleshooting

**WiFi Connection Issues**:
- Check SSID/password spelling
- Verify router signal strength
- Ensure ESP8266 firmware is updated

**Sensor Calibration**:
- Use multimeter to verify actual values
- Adjust offset/sensitivity values accordingly
- Test with known loads

**Data Not Sending**:
- Check backend URL accessibility
- Verify backend accepts the JSON format
- Monitor serial output for error messages

## Customization

Change the hardcoded meter ID for different units:
```cpp
const String SMART_METER_ID = "SM-002-AURORA";  // For second meter
```

Adjust measurement intervals:
```cpp
const unsigned long DATA_SEND_INTERVAL = 60000;  // Every minute
const unsigned long LCD_UPDATE_INTERVAL = 500;   // Twice per second
```

## Status Indicators

**LCD Display**:
- Line 1: `V:230 I:2.15` (Voltage and Current)
- Line 2: `P:495 S:0` (Power and Send failures when connected)
- Line 2: `P:495 NC` (Power and No Connection when disconnected)

**LED States**:
- Green ON: WiFi connected and data sending OK
- Red ON: WiFi disconnected or repeated send failures
- Blue Blink: Taking measurements
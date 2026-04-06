import machine
import network
import time
import math
import urequests
import ujson
import gc

# ================= DEVICE INFO =================
WIFI_SSID     = "Jase"
WIFI_PASSWORD = "Tungsten12#"
BACKEND_URL   = "https://auroraenergy.app/api/smart-meter/data"

SMART_METER_ID = "4410627882"
DEVICE_NAME   = "Aurora Smart Meter POC"

# ================= GPIO =================
# ESP8266 GPIO Map: D1=5, D2=4
LED_GREEN = machine.Pin(5, machine.Pin.OUT)
LED_WHITE = machine.Pin(4, machine.Pin.OUT)
ADC_PIN   = machine.ADC(0)

# ================= MEASUREMENT =================
USE_DUMMY_VOLTAGE = True
DUMMY_VOLTAGE     = 230.0   # Volts (simulated)

ACS_OFFSET  = 2.50          # Calibrate later (Center of ACS output)
ACS_SENS    = 0.100         # ACS712-20A: 100mV/A
ADC_REF     = 1.0           # ESP8266 A0 raw = 0-1V (usually)

SAMPLE_COUNT = 200
SEND_INTERVAL_MS = 10000    # Report every 10 seconds

# ================= GLOBALS =================
wlan = network.WLAN(network.STA_IF)
energy_kwh = 0.0
last_send_time = 0
last_energy_calc_time = time.ticks_ms()

# ================= FUNCTIONS =================

def connect_wifi():
    print("Connecting to WiFi...", end="")
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    
    timeout = 30
    while not wlan.isconnected() and timeout > 0:
        time.sleep(1)
        print(".", end="")
        timeout -= 1
    
    if wlan.isconnected():
        print("\nWiFi Connected! IP:", wlan.ifconfig()[0])
        LED_GREEN.on()
    else:
        print("\nWiFi Connection Failed.")
        LED_GREEN.off()

def read_current_rms():
    """Calculates RMS current by sampling the ACS712 on ADC(0)"""
    sum_sq = 0
    count = 0
    
    LED_WHITE.on()
    for _ in range(SAMPLE_COUNT):
        raw = ADC_PIN.read() # 0-1024
        voltage = (raw / 1024.0) * ADC_REF
        
        # current = (voltage - offset) / sensitivity
        # Note: If voltage divider is present on board, adjust ADC_REF or formulae.
        current = (voltage - ACS_OFFSET) / ACS_SENS
        sum_sq += current * current
        count += 1
        time.sleep_us(500) # Slightly slower sampling for stability in Python
    LED_WHITE.off()
    
    return math.sqrt(sum_sq / count)

def send_data_to_backend(v_rms, i_rms, power, energy):
    if not wlan.isconnected():
        print("WiFi disconnected. Skipping report.")
        LED_GREEN.off()
        return False

    # Perform garbage collection before memory-intensive HTTP operation
    gc.collect()

    try:
        # Build nested payload matching Supabase function expectation
        payload = {
            "meter_id": SMART_METER_ID,
            "device_name": DEVICE_NAME,
            "timestamp": time.time(), # Unix timestamp
            "readings": {
                "voltage_rms": v_rms,
                "current_rms": i_rms,
                "power": power,
                "energy": energy,
                "temperature": 0.0 # Placeholder
            },
            "metadata": {
                "simulated_voltage": USE_DUMMY_VOLTAGE,
                "heap_free": gc.mem_free(),
                "wifi_rssi": wlan.status('rssi') if hasattr(wlan, 'status') else -1
            }
        }

        print("Sending payload...")
        headers = {'Content-Type': 'application/json'}
        response = urequests.post(BACKEND_URL, data=ujson.dumps(payload), headers=headers)
        
        print("HTTP Status Code:", response.status_code)
        print("Response:", response.text)
        response.close()
        
        LED_GREEN.on()
        return True
    except Exception as e:
        print("Error sending data:", e)
        LED_GREEN.off()
        return False

# ================= MAIN LOOP =================

def main():
    global last_send_time, last_energy_calc_time, energy_kwh
    
    LED_GREEN.off()
    LED_WHITE.off()
    
    connect_wifi()
    
    print("Starting Aurora Smart Meter loop...")
    
    while True:
        # 1. Take measurements
        irms = read_current_rms()
        vrms = DUMMY_VOLTAGE if USE_DUMMY_VOLTAGE else 0.0
        power = vrms * irms
        
        # 2. Accumulate Energy (kWh)
        now = time.ticks_ms()
        delta_seconds = time.ticks_diff(now, last_energy_calc_time) / 1000.0
        # Energy (kWh) = (Power (W) * time (s)) / (3600 * 1000)
        energy_kwh += (power * delta_seconds) / 3600000.0
        last_energy_calc_time = now
        
        print("V: {:.1f}V | I: {:.3f}A | P: {:.2f}W | E: {:.6f}kWh".format(vrms, irms, power, energy_kwh))
        
        # 3. Periodically send data
        if time.ticks_diff(now, last_send_time) >= SEND_INTERVAL_MS:
            send_data_to_backend(vrms, irms, power, energy_kwh)
            last_send_time = now
            
        time.sleep(1) # Frequency of measurements

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Stopped by user.")








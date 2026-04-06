#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <math.h>

// ================= DEVICE INFO =================
const String SMART_METER_ID = "44106278820";
const String DEVICE_NAME   = "Aurora Smart Meter v1.0 - ACS712 POC";

// ================= WIFI ================= 
const char* WIFI_SSID     = "Jase";
const char* WIFI_PASSWORD = "Tungsten12#";

// ================= SUPABASE =================
const String SUPABASE_URL = "https://rcthtxwzsqvwivritzln.supabase.co";
const String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM";
const String BACKEND_URL  = SUPABASE_URL + "/functions/v1/smart-meter-webhook";
const String USER_ID      = "c98883f0-8b2c-454e-a48a-781a939f0072";

// ================= TIMING =================
const unsigned long DATA_SEND_INTERVAL = 30000; // 30 seconds
const unsigned long LOOP_DELAY_MS      = 200;

// ================= LED PINS =================
const int LED_GREEN = 14;   // GPIO14 (D5) - WiFi / system status
const int LED_WHITE = 12;   // GPIO12 (D6) - Sampling / activity

// ================= ADC =================
const float ADC_REF_VOLT   = 3.3;
const float ADC_MAX_COUNTS = 1023.0;
const int SAMPLE_COUNT = 300;

// ================= ACS712 (DIRECT, POC) =================
const float ACS_OFFSET = 2.50;     // 0 A output voltage
const float ACS_SENS   = 0.100;    // V/A (20A version)

// ================= POC DUMMY VOLTAGE =================
const bool USE_DUMMY_VOLTAGE = true;
const float DUMMY_VOLTAGE_BASE = 230.0;
const float DUMMY_VOLTAGE_VARIATION = 10.0;
const unsigned long DUMMY_VOLTAGE_PERIOD = 60000;   // 1-minute full sine cycle

// ================= GLOBALS =================
float Irms = 0.0;
float Vrms = 0.0;
bool wifiConnected = false;
unsigned long lastSendTime = 0;
unsigned long startTime = 0;

// =====================================================
void setup() {
  Serial.begin(9600);
  delay(300);

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_WHITE, OUTPUT);

  Serial.println();
  Serial.println("====================================");
  Serial.println(" Aurora Smart Meter – ACS712 POC ");
  Serial.println(" Display: Serial Monitor ");
  Serial.println("====================================");

  connectToWiFi();
  startTime = millis();
}

// =====================================================
void loop() {
  unsigned long now = millis();

  // ===== READ CURRENT =====
  digitalWrite(LED_WHITE, HIGH); // indicate sampling
  Irms = readCurrentRMS();
  digitalWrite(LED_WHITE, LOW);

  // ===== SIMULATE TIME-VARYING VOLTAGE =====
  if (USE_DUMMY_VOLTAGE) {
    float elapsed = (float)((now - startTime) % DUMMY_VOLTAGE_PERIOD);
    float angle = (elapsed / (float)DUMMY_VOLTAGE_PERIOD) * 2.0 * PI;
    Vrms = DUMMY_VOLTAGE_BASE + DUMMY_VOLTAGE_VARIATION * sin(angle);
  } else {
    Vrms = 0.0;
  }

  // ===== SERIAL OUTPUT =====
  Serial.print("Irms: ");
  Serial.print(Irms, 4);
  Serial.print(" A | Vrms: ");
  Serial.print(Vrms, 1);
  Serial.print(" V | WiFi: ");
  Serial.print(wifiConnected ? "OK" : "DOWN");
  Serial.print(" | RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  // ===== SEND DATA =====
  if (wifiConnected && (now - lastSendTime >= DATA_SEND_INTERVAL)) {
    sendDataToBackend();
    lastSendTime = now;
  }

  delay(LOOP_DELAY_MS);
}

// ================= CURRENT RMS =================
float readCurrentRMS() {
  double sumSq = 0.0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    float voltage = (float)analogRead(A0) * ADC_REF_VOLT / ADC_MAX_COUNTS;
    float current = (voltage - ACS_OFFSET) / ACS_SENS;
    sumSq += (double)(current * current);
    delayMicroseconds(200);
  }

  return (float)sqrt(sumSq / (double)SAMPLE_COUNT);
}

// ================= WIFI =================
void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start < 15000)) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    digitalWrite(LED_GREEN, HIGH);
    Serial.println("\nWiFi CONNECTED");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    digitalWrite(LED_GREEN, LOW);
    Serial.println("\nWiFi FAILED");
  }
}

// ================= BACKEND =================
void sendDataToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    digitalWrite(LED_GREEN, LOW);
    Serial.println("WiFi lost. Data not sent.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  http.setTimeout(5000);
  
  if (!http.begin(client, BACKEND_URL)) {
    Serial.println("HTTP begin failed");
    return;
  }
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_ANON_KEY);
  http.addHeader("x-user-id", USER_ID);

  // ===== BUILD JSON PAYLOAD =====
  DynamicJsonDocument doc(512);

  doc["meter_id"] = SMART_METER_ID;
  doc["device_name"] = DEVICE_NAME;

  JsonObject readings = doc.createNestedObject("readings");
  readings["voltage_rms"] = Vrms;
  readings["current_rms"] = Irms;
  
  if (USE_DUMMY_VOLTAGE) {
    readings["power"] = Vrms * Irms;
  }

  JsonObject status = doc.createNestedObject("status");
  status["measurement_mode"] = "POC";
  status["voltage_available"] = !USE_DUMMY_VOLTAGE;
  status["voltage_simulated"] = USE_DUMMY_VOLTAGE;
  status["current_available"] = true;

  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["wifi_rssi"] = WiFi.RSSI();
  metadata["uptime_ms"] = millis();

  String payload;
  serializeJson(doc, payload);

  Serial.print("Sending JSON: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  Serial.print("HTTP Response: ");
  Serial.println(httpCode);

  http.end();
}
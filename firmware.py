#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>
#include <math.h>

// ================= DEVICE INFO =================
const String SMART_METER_ID = "44106278820";
const String DEVICE_NAME   = "Aurora Smart Meter v1.0 - ACS712 POC";

// ================= WIFI ================= 
const char* WIFI_SSID     = "Jase";
const char* WIFI_PASSWORD = "Tungsten12#";

// ================= SUPABASE (LEGACY/REFERENCE) =================
const String SUPABASE_URL = "https://rcthtxwzsqvwivritzln.supabase.co";
const String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM";
const String USER_ID      = "c98883f0-8b2c-454e-a48a-781a939f0072";

// ================= HIVEMQ CLOUD (MQTT) =================
const char* MQTT_SERVER   = "50a08402532e40caaee237591bf35b7e.s1.eu.hivemq.cloud";
const int   MQTT_PORT     = 8883;
const char* MQTT_USER     = "aurora_device"; // Set this in HiveMQ Console
const char* MQTT_PASS     = "Aurora123#";   // Set this in HiveMQ Console
const char* MQTT_TOPIC    = "aurora/meters/44106278820/data";
const char* MQTT_STATUS   = "aurora/meters/44106278820/status";

// ================= TIMING =================
const unsigned long DATA_SEND_INTERVAL = 5000;  // 5 seconds (MQTT is efficient)
const unsigned long LOOP_DELAY_MS      = 200;
const unsigned long RECONNECT_INTERVAL = 5000;

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
unsigned long lastReconnectAttempt = 0;
unsigned long startTime = 0;

WiFiClientSecure espClient;
PubSubClient client(espClient);

// =====================================================
void setup() {
  Serial.begin(115200); // Increased baud rate for more detailed logs
  delay(300);

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_WHITE, OUTPUT);

  Serial.println("\n\n====================================");
  Serial.println(" Aurora Smart Meter – MQTT Enabled ");
  Serial.println(" HiveMQ Cluster: " + String(MQTT_SERVER));
  Serial.println("====================================");

  connectToWiFi();
  
  // Sync time for TLS validation (Essential for HiveMQ)
  configTime(3 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("Waiting for NTP time sync...");
  time_t now = time(nullptr);
  while (now < 8 * 3600 * 2) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println("\nTime synced.");

  // Configure MQTT
  espClient.setInsecure(); // Optional: use setTrustAnchors for better security
  client.setServer(MQTT_SERVER, MQTT_PORT);
  
  startTime = millis();
}

// =====================================================
void loop() {
  unsigned long now = millis();

  // ===== MAINTAIN MQTT CONNECTION =====
  if (!client.connected()) {
    if (now - lastReconnectAttempt > RECONNECT_INTERVAL) {
      lastReconnectAttempt = now;
      if (reconnect()) {
        lastReconnectAttempt = 0;
      }
    }
  } else {
    client.loop();
  }

  // ===== READ CURRENT =====
  digitalWrite(LED_WHITE, HIGH);
  Irms = readCurrentRMS();
  digitalWrite(LED_WHITE, LOW);

  // ===== SIMULATE TIME-VARYING VOLTAGE =====
  if (USE_DUMMY_VOLTAGE) {
    float elapsed = (float)((now - startTime) % DUMMY_VOLTAGE_PERIOD);
    float angle = (elapsed / (float)DUMMY_VOLTAGE_PERIOD) * 2.0 * PI;
    Vrms = DUMMY_VOLTAGE_BASE + DUMMY_VOLTAGE_VARIATION * sin(angle);
  }

  // ===== DATA SENDING =====
  if (client.connected() && (now - lastSendTime >= DATA_SEND_INTERVAL)) {
    publishData();
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

// ================= MQTT =================
bool reconnect() {
  Serial.print("Attempting MQTT connection...");
  // Create a random client ID
  String clientId = "AuroraMeter-";
  clientId += String(SMART_METER_ID);

  // Attempt to connect with LWT (Last Will and Testament)
  if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS, MQTT_STATUS, 1, true, "offline")) {
    Serial.println("connected");
    // Once connected, publish online status
    client.publish(MQTT_STATUS, "online", true);
    return true;
  } else {
    Serial.print("failed, rc=");
    Serial.print(client.state());
    Serial.println(" try again in 5 seconds");
    return false;
  }
}

void publishData() {
  if (!client.connected()) return;

  // ===== BUILD JSON PAYLOAD =====
  DynamicJsonDocument doc(512);
  doc["meter_id"] = SMART_METER_ID;
  doc["device_name"] = DEVICE_NAME;

  JsonObject readings = doc.createNestedObject("readings");
  readings["voltage_rms"] = Vrms;
  readings["current_rms"] = Irms;
  readings["power"] = Vrms * Irms;
  
  JsonObject status = doc.createNestedObject("status");
  status["online"] = true;

  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["wifi_rssi"] = WiFi.RSSI();
  metadata["uptime"] = millis() / 1000;

  String payload;
  serializeJson(doc, payload);

  Serial.print("Publishing to ");
  Serial.print(MQTT_TOPIC);
  Serial.print(": ");
  Serial.println(payload);

  if (client.publish(MQTT_TOPIC, payload.c_str())) {
    Serial.println("Publish success");
  } else {
    Serial.println("Publish failed");
  }
}
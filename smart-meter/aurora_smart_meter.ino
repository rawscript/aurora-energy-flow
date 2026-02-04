#include <Wire.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_ADS1X15.h>

// === HARD CODED SMART METER IDENTIFICATION ===
const String SMART_METER_ID = "4410627882";
const String DEVICE_NAME = "Aurora Smart Meter v1.0";

// === NETWORK CONFIGURATION ===
const char* WIFI_SSID = "WIFI_SSID";
const char* WIFI_PASSWORD = "WIFI_PASSWORD";
const String BACKEND_URL = "https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/smart-meter-webhook";

// === MEASUREMENT INTERVALS ===
const unsigned long DATA_SEND_INTERVAL = 30000; // Send data every 30 seconds
const unsigned long LCD_UPDATE_INTERVAL = 1000;  // Update LCD every second

LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_ADS1115 ads;

#define LED_GREEN D5   // System ON
#define LED_BLUE  D6   // Measurement activity
#define LED_RED   D7   // Fault / Reserved

#define ACS_OFFSET   2.50      // Volts at zero current (CALIBRATE!)
#define ACS_SENS     0.100     // V/A for ACS712-20A

#define ZMPT_CAL     250.0     // Voltage scaling factor (CALIBRATE!)
#define ADC_REF      4.096     // ADS1115 ±4.096 V

#define LM35_SCALE   100.0     // °C per volt (10 mV/°C)
#define SAMPLE_COUNT 500

float Vrms = 0.0;
float Irms = 0.0;
float Power = 0.0;
float Energy = 0.0;
float Temperature = 0.0;

unsigned long lastEnergyTime = 0;
unsigned long lastDataSendTime = 0;
unsigned long lastLCDUpdateTime = 0;

bool wifiConnected = false;
int failedSendAttempts = 0;
const int MAX_FAILED_ATTEMPTS = 5;

float readVoltageRMS();
float readCurrentRMS();
float readTemperature();
void updateLCD();
void connectToWiFi();
bool sendDataToBackend();
String buildJSONPayload();
void handleWiFiStatus();

void setup() {
  Serial.begin(9600);
  Wire.begin();

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  
  lcd.setCursor(0, 0);
  lcd.print("Aurora Meter");
  lcd.setCursor(0, 1);
  lcd.print(SMART_METER_ID);
  delay(2000);

  ads.begin();
  ads.setGain(GAIN_ONE);   // ±4.096 V

  // Connect to WiFi
  connectToWiFi();
  
  digitalWrite(LED_GREEN, wifiConnected ? HIGH : LOW);
  digitalWrite(LED_RED, wifiConnected ? LOW : HIGH);

  lastEnergyTime = millis();
  lastDataSendTime = millis();
  lastLCDUpdateTime = millis();
}

void loop() {
  unsigned long now = millis();
  
  // Handle WiFi reconnection
  handleWiFiStatus();
  
  // Read measurements every cycle
  digitalWrite(LED_BLUE, HIGH);
  
  Vrms = readVoltageRMS();
  Irms = readCurrentRMS();
  Power = Vrms * Irms;      // PF ≈ 1
  Temperature = readTemperature();

  float deltaHrs = (now - lastEnergyTime) / 3600000.0;
  Energy += Power * deltaHrs;
  lastEnergyTime = now;
  
  digitalWrite(LED_BLUE, LOW);
  
  // Update LCD periodically
  if (now - lastLCDUpdateTime >= LCD_UPDATE_INTERVAL) {
    updateLCD();
    lastLCDUpdateTime = now;
  }
  
  // Send data to backend periodically
  if (wifiConnected && (now - lastDataSendTime >= DATA_SEND_INTERVAL)) {
    if (sendDataToBackend()) {
      failedSendAttempts = 0;
      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(LED_RED, LOW);
    } else {
      failedSendAttempts++;
      if (failedSendAttempts >= MAX_FAILED_ATTEMPTS) {
        digitalWrite(LED_RED, HIGH);
        digitalWrite(LED_GREEN, LOW);
      }
    }
    lastDataSendTime = now;
  }
  
  delay(100); // Small delay to prevent busy waiting
}

float readVoltageRMS() {
  double sumSq = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    int16_t adc = ads.readADC_SingleEnded(1);
    float v = (adc * ADC_REF) / 32768.0;
    sumSq += v * v;
    delayMicroseconds(200);
  }

  return sqrt(sumSq / SAMPLE_COUNT) * ZMPT_CAL;
}

float readCurrentRMS() {
  double sumSq = 0;

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    int16_t adc = ads.readADC_SingleEnded(0);
    float v = (adc * ADC_REF) / 32768.0;
    float iAmp = (v - ACS_OFFSET) / ACS_SENS;
    sumSq += iAmp * iAmp;
    delayMicroseconds(200);
  }

  return sqrt(sumSq / SAMPLE_COUNT);
}

float readTemperature() {
  long sum = 0;

  for (int i = 0; i < 20; i++) {
    sum += ads.readADC_SingleEnded(2);
    delay(2);
  }

  float adcAvg = sum / 20.0;
  float voltage = (adcAvg * ADC_REF) / 32768.0;

  return voltage * LM35_SCALE;   // °C
}

void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.print("V:");
  lcd.print(Vrms, 0);
  lcd.print(" I:");
  lcd.print(Irms, 2);

  lcd.setCursor(0, 1);
  if (wifiConnected) {
    lcd.print("P:");
    lcd.print(Power, 0);
    lcd.print(" S:");
    lcd.print(failedSendAttempts);
  } else {
    lcd.print("P:");
    lcd.print(Power, 0);
    lcd.print(" NC");  // No Connection
  }
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startAttemptTime = millis();
  
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 15000) {
    delay(500);
    Serial.print(".");
    lcd.setCursor(0, 1);
    lcd.print("Retrying...");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("");
    Serial.println("WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP()[0]);
    lcd.print(".");
    lcd.print(WiFi.localIP()[1]);
    delay(2000);
  } else {
    wifiConnected = false;
    Serial.println("Failed to connect to WiFi");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed");
    lcd.setCursor(0, 1);
    lcd.print("Check config");
    delay(3000);
  }
}

bool sendDataToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return false;
  }

  HTTPClient http;
  http.setTimeout(5000);
  
  Serial.println("Sending data to backend...");
  
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM");
  http.addHeader("x-user-id", "default-user");  // This should be configurable per installation
  
  String payload = buildJSONPayload();
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);
    http.end();
    return true;
  } else {
    Serial.print("Error on sending POST: ");
    Serial.println(httpResponseCode);
    http.end();
    return false;
  }
}

String buildJSONPayload() {
  StaticJsonDocument<500> doc;
  
  doc["meter_id"] = SMART_METER_ID;
  doc["device_name"] = DEVICE_NAME;
  doc["timestamp"] = millis();
  
  JsonObject readings = doc.createNestedObject("readings");
  readings["voltage_rms"] = Vrms;
  readings["current_rms"] = Irms;
  readings["power"] = Power;
  readings["energy"] = Energy;
  readings["temperature"] = Temperature;
  
  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["wifi_rssi"] = WiFi.RSSI();
  metadata["uptime_ms"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("JSON Payload: ");
  Serial.println(jsonString);
  
  return jsonString;
}

void handleWiFiStatus() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    wifiConnected = false;
    Serial.println("WiFi connection lost!");
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, HIGH);
  } else if (WiFi.status() == WL_CONNECTED && !wifiConnected) {
    wifiConnected = true;
    Serial.println("WiFi reconnected!");
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_RED, LOW);
  }
}
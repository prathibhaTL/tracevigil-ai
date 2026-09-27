/*
  TraceVigil AI - ESP32 Smart Logistics Firmware
  ------------------------------------------------
  This version uses Adafruit_MPU6050 library (more reliable)
  and has better error handling so it prints output consistently.

  Hardware:
    - ESP32 Dev Module
    - MPU6050 (I2C: SDA=GPIO21, SCL=GPIO22)
    - DHT22 (GPIO4)
    - Neo-6M GPS (RX=GPIO16, TX=GPIO17)
    - RC522 RFID (SPI: SS=GPIO5, SCK=GPIO18, MOSI=GPIO23, MISO=GPIO19, RST=GPIO27)
    - Buzzer (GPIO25)

  REQUIRED Libraries (Install via Arduino IDE -> Sketch -> Include Library -> Manage Libraries):
    1. "Adafruit MPU6050" by Adafruit
    2. "Adafruit Unified Sensor" by Adafruit
    3. "DHT sensor library" by Adafruit
    4. "TinyGPS++" by Mikal Hart
    5. "MFRC522" by GithubCommunity

  BEFORE UPLOADING - Change these 3 lines in CONFIGURATION below:
    - WIFI_SSID     = your WiFi name
    - WIFI_PASSWORD = your WiFi password
    - SERVER_URL    = your laptop IP (run: ipconfig in PowerShell)
*/

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <TinyGPS++.h>
#include <MFRC522.h>
#include <SPI.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPIFFS.h>
#include <mbedtls/sha256.h>

// ===================== CONFIGURATION =====================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";      // <-- CHANGE THIS
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // <-- CHANGE THIS
const char* SERVER_URL    = "http://192.168.1.5:5000"; // <-- CHANGE THIS (your laptop IP)

const char* TRACE_ID       = "TRUCK-001";
const char* DRIVER_NAME    = "Ramesh Kumar";
const char* OWNER_NAME     = "Global Pharma Ltd";
const char* PRODUCT_NAME   = "Vaccines";
const char* ROUTE_SEGMENT  = "Bengaluru-Mysore-Hwy";
const float THRESHOLD      = 35.0;

// Allowed RFID cards (use the UID you get from your first scan!)
const String ALLOWED_RFID[] = { "3A7F2B9C", "A1B2C3D4" };
const int ALLOWED_RFID_COUNT = 2;

const float IMPACT_THRESHOLD   = 15.0;
const float TEMP_THRESHOLD     = 35.0;
const unsigned long SEND_INTERVAL_MS = 3000;

// ===================== PIN DEFINITIONS =====================
#define DHT_PIN     4
#define BUZZER_PIN  25
#define GPS_RX      16
#define GPS_TX      17
#define RFID_SS     5
#define RFID_RST    27

// ===================== SENSOR OBJECTS =====================
Adafruit_MPU6050 mpu;
DHT dht(DHT_PIN, DHT22);
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
MFRC522 rfid(RFID_SS, RFID_RST);

// ===================== GLOBAL STATE =====================
String prevHash = "genesis";
float tempHistory[5] = {0, 0, 0, 0, 0};
int tempIndex = 0;
bool tempBufferFull = false;
unsigned long lastSend = 0;
bool wifiConnected = false;
bool mpuOk = false;

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("  TRACEABILITY SYSTEM STARTING          ");
  Serial.println("========================================");

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // --- Initialize MPU6050 (using Adafruit library - RELIABLE) ---
  Wire.begin();
  if (!mpu.begin()) {
    Serial.println("[WARN] MPU6050 not found! Impact detection disabled.");
    mpuOk = false;
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_5_HZ);
    Serial.println("[OK] MPU6050 ready.");
    mpuOk = true;
  }

  // --- Initialize DHT22 ---
  dht.begin();
  Serial.println("[OK] DHT22 ready.");

  // --- Initialize GPS ---
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("[OK] GPS serial ready.");

  // --- Initialize RFID ---
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("[OK] RFID RC522 ready.");

  // --- Initialize SPIFFS ---
  if (!SPIFFS.begin(true)) {
    Serial.println("[WARN] SPIFFS mount failed. Offline storage disabled.");
  } else {
    Serial.println("[OK] SPIFFS ready.");
  }

  // --- Connect to WiFi (NON-BLOCKING with short timeout) ---
  Serial.print("[WiFi] Connecting to ");
  Serial.print(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n[OK] WiFi Connected!");
    Serial.print("[OK] ESP32 IP: ");
    Serial.println(WiFi.localIP());
    syncOfflinePackets();
  } else {
    wifiConnected = false;
    Serial.println("\n[WARN] WiFi FAILED. Running in OFFLINE mode.");
    playBuzzer("OFFLINE_MODE");
  }

  Serial.println("========================================");
  Serial.println("  SYSTEM READY - SENDING DATA EVERY 3s  ");
  Serial.println("========================================\n");
}

// ===================== LOOP =====================
void loop() {
  // Feed GPS data continuously
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  unsigned long now = millis();
  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;
    readAndSendPacket();
  }
}

// ===================== PACKET BUILDER =====================
void readAndSendPacket() {
  // 1. Read DHT22
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  if (isnan(temperature)) temperature = 25.0;
  if (isnan(humidity)) humidity = 60.0;

  // Update temperature history
  tempHistory[tempIndex] = temperature;
  tempIndex = (tempIndex + 1) % 5;
  if (tempIndex == 0) tempBufferFull = true;

  float spoilageMinutes = predictSpoilage(temperature);

  // 2. Read MPU6050 impact (using Adafruit library)
  float impact = 0.0;
  if (mpuOk) {
    sensors_event_t a, g, tempEvent;
    mpu.getEvent(&a, &g, &tempEvent);
    impact = sqrt(sq(a.acceleration.x) + sq(a.acceleration.y) + sq(a.acceleration.z));
  }

  // 3. Read GPS
  String latitude  = gps.location.isValid() ? String(gps.location.lat(), 6) : "SEARCHING";
  String longitude = gps.location.isValid() ? String(gps.location.lng(), 6) : "SEARCHING";

  // 4. Read RFID
  String rfidUid = readRFID();
  String accessStatus = "NONE";
  if (rfidUid != "") {
    accessStatus = isRfidAllowed(rfidUid) ? "GRANTED" : "DENIED";
  }

  // 5. Determine status
  String status = "NORMAL";
  if (impact > IMPACT_THRESHOLD) {
    status = "IMPACT_ALERT";
    playBuzzer("IMPACT_ALERT");
  } else if (spoilageMinutes < 60.0) {
    status = "SPOILAGE_WARNING";
    playBuzzer("SPOILAGE_WARNING");
  } else if (accessStatus == "DENIED") {
    status = "ACCESS_DENIED";
    playBuzzer("ACCESS_DENIED");
  }

  // 6. Build hash base (must match backend EXACTLY)
  String base =
    "ID:" + String(TRACE_ID) +
    "|Driver:" + String(DRIVER_NAME) +
    "|Owner:" + String(OWNER_NAME) +
    "|Product:" + String(PRODUCT_NAME) +
    "|Threshold:" + String(THRESHOLD, 2) +
    "|Segment:" + String(ROUTE_SEGMENT) +
    "|Lat:" + latitude +
    "|Lng:" + longitude +
    "|Impact:" + String(impact, 2) +
    "|Temp:" + String(temperature, 2) +
    "|Hum:" + String(humidity, 2) +
    "|Spoilage:" + String(spoilageMinutes, 2) +
    "|RFID:" + rfidUid +
    "|Access:" + accessStatus;

  String currHash = sha256(base + prevHash);

  // 7. Build JSON packet
  String json = "{";
  json += "\"traceId\":\"" + String(TRACE_ID) + "\",";
  json += "\"driverName\":\"" + String(DRIVER_NAME) + "\",";
  json += "\"owner\":\"" + String(OWNER_NAME) + "\",";
  json += "\"product\":\"" + String(PRODUCT_NAME) + "\",";
  json += "\"threshold\":" + String(THRESHOLD, 2) + ",";
  json += "\"segment\":\"" + String(ROUTE_SEGMENT) + "\",";
  json += "\"latitude\":\"" + latitude + "\",";
  json += "\"longitude\":\"" + longitude + "\",";
  json += "\"impact\":" + String(impact, 2) + ",";
  json += "\"temperature\":" + String(temperature, 2) + ",";
  json += "\"humidity\":" + String(humidity, 2) + ",";
  json += "\"spoilageMinutes\":" + String(spoilageMinutes, 2) + ",";
  json += "\"status\":\"" + status + "\",";
  json += "\"rfidUid\":\"" + rfidUid + "\",";
  json += "\"accessStatus\":\"" + accessStatus + "\",";
  json += "\"prevHash\":\"" + prevHash + "\",";
  json += "\"currHash\":\"" + currHash + "\"";
  json += "}";

  // 8. Print to Serial Monitor (ALWAYS works, even without WiFi)
  Serial.println("\n>>>>>>>> TRACEABILITY UPDATE <<<<<<<<");
  Serial.println("RFID UID:     " + (rfidUid == "" ? "No Card" : rfidUid));
  Serial.println("Access:       " + accessStatus);
  Serial.println("Location:     " + latitude + ", " + longitude);
  Serial.println("Temperature:  " + String(temperature, 2) + " C");
  Serial.println("Humidity:     " + String(humidity, 2) + " %");
  Serial.println("Impact:       " + String(impact, 2) + " g");
  Serial.println("Spoilage:     " + String(spoilageMinutes, 1) + " min");
  Serial.println("Status:       " + status);
  Serial.println("Hash:         " + currHash.substring(0, 16) + "...");
  Serial.println("WiFi:         " + String(wifiConnected ? "CONNECTED" : "OFFLINE"));
  Serial.println("--------------------------------------");
  Serial.println("[Packet] " + json);

  // 9. Send to server if WiFi is connected
  if (wifiConnected) {
    bool sent = sendHttp(json);
    if (!sent) {
      saveOffline(json);
      playBuzzer("OFFLINE_MODE");
    }
  } else {
    saveOffline(json);
  }

  // Update hash chain
  prevHash = currHash;
}

// ===================== SPOILAGE PREDICTION =====================
float predictSpoilage(float currentTemp) {
  if (!tempBufferFull && tempIndex < 2) return 999.0;

  int count = tempBufferFull ? 5 : tempIndex;
  float sum = 0;
  for (int i = 0; i < count; i++) sum += tempHistory[i];
  float avg = sum / count;

  if (avg <= TEMP_THRESHOLD) return 999.0;

  float diff = avg - TEMP_THRESHOLD;
  float minutes = max(5.0, 120.0 - (diff * 10.0));
  return minutes;
}

// ===================== RFID =====================
String readRFID() {
  if (!rfid.PICC_IsNewCardPresent()) return "";
  if (!rfid.PICC_ReadCardSerial()) return "";

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  return uid;
}

bool isRfidAllowed(String uid) {
  // Remove colons if present for comparison
  uid.replace(":", "");
  for (int i = 0; i < ALLOWED_RFID_COUNT; i++) {
    if (uid == ALLOWED_RFID[i]) return true;
  }
  return false;
}

// ===================== SHA-256 =====================
String sha256(String input) {
  mbedtls_sha256_context ctx;
  unsigned char hash[32];

  mbedtls_sha256_init(&ctx);
  mbedtls_sha256_starts(&ctx, 0);
  mbedtls_sha256_update(&ctx, (const unsigned char*)input.c_str(), input.length());
  mbedtls_sha256_finish(&ctx, hash);
  mbedtls_sha256_free(&ctx);

  String result = "";
  for (int i = 0; i < 32; i++) {
    if (hash[i] < 0x10) result += "0";
    result += String(hash[i], HEX);
  }
  result.toLowerCase();
  return result;
}

// ===================== HTTP =====================
bool sendHttp(String json) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/trace";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  int code = http.POST(json);
  http.end();

  if (code == 201 || code == 200) {
    Serial.println("[HTTP] Sent OK (" + String(code) + ")");
    return true;
  } else {
    Serial.println("[HTTP] Failed (" + String(code) + ")");
    return false;
  }
}

// ===================== OFFLINE STORAGE =====================
void saveOffline(String json) {
  File f = SPIFFS.open("/offline.txt", FILE_APPEND);
  if (!f) {
    Serial.println("[SPIFFS] Failed to save offline");
    return;
  }
  f.println(json);
  f.close();
  Serial.println("[SPIFFS] Saved offline packet");
}

void syncOfflinePackets() {
  if (!SPIFFS.exists("/offline.txt")) return;

  File f = SPIFFS.open("/offline.txt", FILE_READ);
  if (!f) return;

  Serial.println("[SPIFFS] Syncing offline packets...");
  int sent = 0, failed = 0;

  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    if (sendHttp(line)) sent++;
    else failed++;
    delay(200);
  }
  f.close();

  if (failed == 0) {
    SPIFFS.remove("/offline.txt");
    Serial.println("[SPIFFS] All " + String(sent) + " synced!");
  } else {
    Serial.println("[SPIFFS] Synced " + String(sent) + ", failed " + String(failed));
  }
}

// ===================== BUZZER =====================
void playBuzzer(String alertType) {
  if (alertType == "IMPACT_ALERT") {
    for (int i = 0; i < 10; i++) {
      digitalWrite(BUZZER_PIN, HIGH); delay(50);
      digitalWrite(BUZZER_PIN, LOW);  delay(50);
    }
  }
  else if (alertType == "SPOILAGE_WARNING") {
    for (int i = 0; i < 5; i++) {
      digitalWrite(BUZZER_PIN, HIGH); delay(200);
      digitalWrite(BUZZER_PIN, LOW);  delay(200);
    }
  }
  else if (alertType == "ACCESS_DENIED") {
    for (int i = 0; i < 4; i++) {
      digitalWrite(BUZZER_PIN, HIGH); delay(100);
      digitalWrite(BUZZER_PIN, LOW);  delay(100);
    }
  }
  else if (alertType == "OFFLINE_MODE") {
    for (int i = 0; i < 2; i++) {
      digitalWrite(BUZZER_PIN, HIGH); delay(100);
      digitalWrite(BUZZER_PIN, LOW);  delay(100);
    }
  }
}

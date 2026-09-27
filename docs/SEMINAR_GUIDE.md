# TraceVigil AI - Complete Seminar Presentation Guide

## 1. Project Title Slide

**Title:** TraceVigil AI - Smart Logistics and Cargo Safety System  
**Subtitle:** Real-time monitoring with ESP32, secure blockchain-style audit trails, and predictive alerts  
**Presented by:** [Your Name]  
**Tech Stack:** ESP32 | Node.js | MongoDB | React | SHA-256 | RFID

---

## 2. Problem Statement (Slide 2)

**The Problem:**
- Cargo theft and tampering cost the logistics industry billions annually
- Temperature-sensitive goods (vaccines, chemicals) spoil without real-time monitoring
- No secure way to prove shipment integrity to clients or regulators
- Drivers have no visibility into cargo conditions while on the road
- Internet connectivity is unreliable in remote areas

**Real-world impact:**
- Vaccines ruined due to temperature excursions
- High-value electronics stolen mid-transit
- Insurance disputes because of lack of evidence

---

## 3. Solution Overview (Slide 3)

**TraceAbility** is an end-to-end smart logistics system that:

1. **Monitors** shipments in real-time using ESP32 hardware sensors
2. **Secures** data using SHA-256 hash chaining (tamper-proof audit trail)
3. **Predicts** spoilage before it happens using temperature trend analysis
4. **Alerts** stakeholders instantly via email and visual dashboard alerts
5. **Authorizes** loading/unloading using RFID cards
6. **Survives** internet outages by storing data locally and syncing later
7. **Controls** access with separate Admin and Driver dashboard views

---

## 4. System Architecture (Slide 4)

```
┌─────────────────────────────────────────────────────────────────┐
│                        HARDWARE LAYER                            │
│  ESP32 Dev Module + MPU6050 + DHT22 + GPS Neo-6M + RC522 RFID  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP POST (JSON packets)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                               │
│  Node.js + Express + MongoDB + JWT Auth + Nodemailer           │
│  - Receives sensor packets                                       │
│  - Verifies SHA-256 hash chain                                   │
│  - Stores in MongoDB                                             │
│  - Sends email alerts                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                               │
│  React + Vite + Tailwind CSS + Recharts + Lucide Icons         │
│  - Premium cyber-tech dashboard                                  │
│  - Real-time charts and gauges                                   │
│  - Separate Admin / Driver views                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Hardware Layer Deep Dive (Slide 5)

### ESP32 Pin Connections

| Sensor | VCC | GND | Data Pins |
|--------|-----|-----|-----------|
| MPU6050 | 3V3 | GND | SDA=GPIO21, SCL=GPIO22 |
| DHT22 | 3V3 | GND | DATA=GPIO4 |
| GPS Neo-6M | 3V3/5V | GND | TX=GPIO16, RX=GPIO17 |
| RC522 RFID | 3V3 | GND | SS=GPIO5, SCK=GPIO18, MOSI=GPIO23, MISO=GPIO19, RST=GPIO27 |
| Buzzer | GPIO25 | GND | - |

### What Each Sensor Does

| Sensor | Purpose | Data Produced |
|--------|---------|---------------|
| MPU6050 | Detects shocks, vibrations, rough handling | Impact force in m/s² |
| DHT22 | Measures cargo environment | Temperature (°C) and Humidity (%) |
| GPS Neo-6M | Tracks vehicle location | Latitude and Longitude |
| RC522 RFID | Authorizes personnel | UID string (allowed/denied) |
| Buzzer | Audio alerts | Different patterns for different alerts |

### File: `firmware/arduino/traceability.ino`

This is the canonical Arduino firmware. The equivalent PlatformIO source is `firmware/platformio/src/main.cpp`, with build settings in `firmware/platformio/platformio.ini`.

**What it contains:**
- WiFi connection logic
- Sensor reading functions (MPU6050, DHT22, GPS, RFID)
- Spoilage prediction algorithm (last 5 temperature readings, threshold 35°C)
- Buzzer alert patterns (IMPACT_ALERT, SPOILAGE_WARNING, ACCESS_DENIED, OFFLINE_MODE)
- SHA-256 hash calculation using mbed TLS
- SPIFFS offline storage (saves packets when WiFi fails)
- HTTP POST to backend every 5 seconds

**Key code snippet to explain:**
```cpp
// SHA-256 Hash Chain
String base = "ID:" + traceId + "|Lat:" + lat + "|Lng:" + lng + 
              "|Impact:" + impact + "|Temp:" + temp + "|Hum:" + humidity +
              "|Spoilage:" + spoilage + "|RFID:" + rfidUid + "|Access:" + accessStatus;
String currHash = sha256(base + prevHash);
prevHash = currHash; // Chain continues
```

**Why this matters:** Each packet's hash depends on the previous packet's hash. If anyone tampers with data in the database, the hash chain breaks and we instantly detect it.

---

## 6. Backend Layer Deep Dive (Slide 6)

### File: `backend/server.js`

**What it contains:**
- Express server setup on port 5000
- MongoDB connection
- 9 route handlers (8 API routes plus the health-check route):

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/` | GET | None | Backend health check |
| `/api/auth/register` | POST | None | Create admin/driver accounts |
| `/api/auth/login` | POST | None | Login and return a JWT |
| `/api/trace` | POST | None | Receive ESP32 sensor packets |
| `/api/trace` | GET | Admin | Return the latest 100 packets |
| `/api/trace/latest` | GET | Admin | Return the most recent packet |
| `/api/trace/driver/latest` | GET | Authenticated admin or driver | Return limited driver data |
| `/api/hotspots` | GET | Admin | Return aggregated damage hotspots |
| `/api/damage-events` | GET | Admin | Return the latest 100 damage events |

**Key feature: Tamper Detection**
```javascript
function calculateHashFromPacket(packet) {
  const base = `ID:${packet.traceId}|Lat:${packet.latitude}...|Access:${packet.accessStatus}`;
  return crypto.createHash("sha256").update(base + packet.prevHash).digest("hex");
}

const recalculatedHash = calculateHashFromPacket(payload);
const tampered = recalculatedHash !== payload.currHash;
```

The backend recalculates the hash using the exact same formula as the ESP32. The base string includes trace ID, driver, owner, product, threshold, segment, location, impact, temperature, humidity, spoilage estimate, RFID UID, and access status. If the recalculated hash does not match `currHash`, `tampered: true` is stored.

### File: `backend/models/tracepacket.js`

**What it contains:** MongoDB schema defining what a "packet" looks like:
- traceId, latitude, longitude
- impact, temperature, humidity
- spoilageMinutes, status
- rfidUid, accessStatus
- prevHash, currHash, tampered (boolean)
- createdAt, updatedAt (timestamps)

### File: `backend/models/user.js`

**What it contains:** MongoDB schema for user accounts:
- name, email, password (hashed with bcrypt)
- role: "admin" or "driver"

### File: `backend/middleware/auth.js`

**What it contains:** JWT token verification. Protects routes so only logged-in users can access them. Admin-only routes reject drivers.

### File: `backend/utils/sendAlert.js`

**What it contains:** Email alert sender using Nodemailer. Sends emails for:
- Impact alerts
- Spoilage warnings
- Access denied
- Offline mode
- Tampered packets

---

## 7. Frontend Layer Deep Dive (Slide 7)

### File: `frontend/src/loginpage.jsx`

**What it contains:**
- Dark futuristic login/register screen
- Gradient "Sign In" button
- Role selection (Admin/Driver) during registration
- Form validation and error messages
- Mobile-responsive design

### File: `frontend/src/AdminDashboard.jsx`

**What it contains:** The main cyber-tech control center with:

| Panel | What It Shows |
|-------|---------------|
| **Shipment Flow** | Warehouse → In Transit → Hospital progression |
| **Shipment Tracker** | Dark map with cyan route line and live dot |
| **Predictive Alerts** | Red critical alerts or green "All systems nominal" |
| **Active Shipment** | TRUCK-001 details, owner, driver, product, threshold |
| **Driver Rating** | 2/5 stars with performance line graph |
| **Live Telemetry** | Latitude, Longitude, RFID Access, Hash Chain |
| **Live Audit Log** | Table with Time, Lat, Lng, Temp, Vibration, SECURE/VOID status |
| **Live Gauges** | Semi-circular SVG gauges for Temperature and Vibration |
| **Trend Prediction** | Area chart with red threshold line and integrity warning |
| **PDF Download** | Generates compliance audit report as PDF |

**Tech used:** React hooks, Recharts for graphs, Tailwind CSS for styling, Lucide icons

### File: `frontend/src/DriverDashboard.jsx`

**What it contains:** Limited mobile-friendly view showing only:
- Truck ID
- Current Location
- Status
- RFID Access
- Last Updated time

**Why this matters:** Drivers shouldn't see sensitive data like hash chains or full audit logs.

### File: `frontend/src/api.js`

**What it contains:** API base URL and helper functions for authentication headers.

---

## 8. Data Flow Explanation (Slide 8)

### Step-by-step: What happens when a truck is on the road?

```
Step 1: ESP32 reads all sensors
  MPU6050 → impact = 11.5 m/s²
  DHT22   → temperature = 28°C, humidity = 62%
  GPS     → lat = 12.97200, lng = 77.59100
  RFID    → no card scanned

Step 2: ESP32 calculates spoilage
  Last 5 temps: [27, 28, 28.5, 29, 28]
  Average = 28.1°C → Below 35°C threshold
  spoilageMinutes = 999 (safe)

Step 3: ESP32 determines status
  impact < 15, temp < 35, no RFID → status = "NORMAL"

Step 4: ESP32 builds hash
  base = "ID:TRUCK-001|Lat:12.97200|Lng:77.59100|Impact:11.50|Temp:28.00|Hum:62.00|Spoilage:999.00|RFID:|Access:NONE"
  currHash = SHA256(base + prevHash)

Step 5: ESP32 sends JSON to backend
  HTTP POST http://192.168.1.5:5000/api/trace
  Body: {traceId, latitude, longitude, impact, temperature, humidity,
         spoilageMinutes, status, rfidUid, accessStatus, prevHash, currHash}

Step 6: Backend verifies hash
  Recalculates hash using same formula
  If mismatch → marks tampered = true, sends alert email

Step 7: Backend stores in MongoDB
  Document saved with all fields + tampered flag + timestamp

Step 8: Dashboard fetches data
  React calls GET /api/trace/latest every 3 seconds
  Updates charts, gauges, alerts in real-time

Step 9: User sees live update
  Temperature gauge shows 28°C
  Map dot moves along cyan route
  Audit log table gets new SECURE row
```

---

## 9. Key Features to Highlight (Slide 9)

### Feature 1: SHA-256 Hash Chain (Tamper Detection)
- Every packet's hash depends on the previous packet
- Changing one bit in history breaks the entire chain
- Backend recalculates and flags tampered packets instantly
- **Real-world analogy:** Like a blockchain, but simpler and faster

### Feature 2: Offline Mode with SPIFFS
- If WiFi disconnects, ESP32 saves packets to internal flash storage
- When WiFi returns, all saved packets sync automatically
- **Real-world benefit:** Trucks drive through tunnels, rural areas, bad network zones

### Feature 3: Predictive Spoilage
- Tracks last 5 temperature readings
- If average exceeds 35°C, estimates time until spoilage
- **Real-world benefit:** Prevents vaccine/chemical destruction before it happens

### Feature 4: RFID Authorization
- Only pre-approved RFID cards can trigger "GRANTED" status
- Unknown cards show "DENIED" and trigger alerts
- **Real-world benefit:** Prevents unauthorized loading/unloading

### Feature 5: Role-Based Access
- Admin sees everything: maps, charts, hash chains, audit logs
- Driver sees only: location, status, RFID result
- **Real-world benefit:** Security and privacy separation

---

## 10. Demo Script (What to Show Live)

### Part 1: Dashboard (2 minutes)
1. Open browser to `http://localhost:5173`
2. Login as admin
3. Point out: "This is the Command Center"
4. Show the shipment flow, map, gauges
5. Scroll to audit log: "Every single packet is logged with a hash"

### Part 2: Backend Verification (1 minute)
1. Open MongoDB Compass
2. Show the `tracepackets` collection
3. Point out `currHash` and `tampered` fields
4. Explain: "If someone hacks the database, we know immediately"

### Part 3: Hardware Simulation (1 minute)
1. Open Arduino IDE Serial Monitor
2. Show the JSON packets being printed
3. Point out: "This is the exact data coming from the real truck"

### Part 4: Alert Simulation (1 minute)
1. Show the email inbox (if configured)
2. Or show the red alert banner on dashboard
3. Explain: "When impact exceeds 15 m/s², everyone gets notified instantly"

---

## 11. Comparison Table (Slide 10)

| Feature | Traditional Logistics | TraceAbility |
|---------|----------------------|--------------|
| Location tracking | Manual GPS check | Automatic real-time GPS |
| Temperature monitoring | Manual thermometer | Continuous DHT22 sensor |
| Impact detection | None | MPU6050 accelerometer |
| Data security | Paper logs / Excel | SHA-256 hash chain |
| Alerts | Phone calls | Automatic email alerts |
| Offline handling | Data loss | SPIFFS storage + sync |
| Access control | Keys / passwords | RFID card authorization |
| Audit compliance | Manual reports | One-click PDF generation |

---

## 12. Future Enhancements (Slide 11)

- **Machine Learning:** Predict route delays using traffic + weather APIs
- **Blockchain:** Store hashes on Ethereum for third-party verification
- **Mobile App:** Native Android/iOS app for drivers
- **Multi-truck:** Support fleet management with multiple simultaneous trackers
- **Camera Module:** Add ESP32-CAM for photo evidence of cargo condition
- **Cloud Deployment:** Host backend on AWS/Heroku for global access

---

## 13. Q&A Preparation

### Expected Question 1: "Why SHA-256 and not real blockchain?"
**Answer:** SHA-256 hash chaining provides the same tamper-detection guarantee as blockchain but is much faster and doesn't require expensive mining or gas fees. For a logistics system sending packets every 5 seconds, blockchain would be too slow and costly.

### Expected Question 2: "What if someone tampers with the ESP32 itself?"
**Answer:** The ESP32 is inside the locked cargo compartment. If someone opens it, the accelerometer detects the movement (impact alert), and the RFID system logs unauthorized access. Physical tampering triggers multiple alerts.

### Expected Question 3: "How accurate is the GPS?"
**Answer:** Neo-6M GPS has 2-3 meter accuracy outdoors. For logistics tracking (city-level), this is more than sufficient.

### Expected Question 4: "What about battery life?"
**Answer:** The ESP32 can be powered by the vehicle's 12V battery through a voltage regulator. It consumes very little power (approx 100-200mA).

### Expected Question 5: "Can this scale to 1000 trucks?"
**Answer:** Yes. The backend is stateless Node.js + MongoDB. We can deploy multiple backend instances behind a load balancer. MongoDB supports sharding for horizontal scaling.

---

## 14. File Quick Reference

| File | What It Does | Lines |
|------|--------------|-------|
| `firmware/arduino/traceability.ino` | ESP32 firmware - reads sensors, calculates hashes, sends data | ~440 |
| `firmware/platformio/src/main.cpp` | PlatformIO equivalent of the canonical firmware | ~441 |
| `tools/serial_bridge.py` | Forwards canonical ESP32 JSON serial packets to the backend | ~150 |
| `backend/seed-dummy.js` | Seeds demo trace packets and damage events | ~194 |
| `backend/server.js` | Express server - API endpoints, auth, hash verification | ~226 |
| `backend/models/tracepacket.js` | MongoDB schema for sensor packets | ~22 |
| `backend/models/user.js` | MongoDB schema for user accounts | ~13 |
| `backend/middleware/auth.js` | JWT token verification middleware | ~23 |
| `backend/utils/sendAlert.js` | Email alert sender using Nodemailer | ~37 |
| `frontend/src/AdminDashboard.jsx` | Premium admin control center UI | ~914 |
| `frontend/src/DriverDashboard.jsx` | Limited driver mobile view | ~130 |
| `frontend/src/loginpage.jsx` | Login and registration screen | ~196 |
| `frontend/src/api.js` | API base URL and auth helpers | ~14 |
| `frontend/src/app.jsx` | Main app router (login vs dashboard) | ~29 |
| `frontend/src/index.css` | Tailwind CSS + custom animations | ~88 |
| `frontend/tailwind.config.js` | Tailwind theme customization | ~57 |
| `docs/START.md` | Beginner setup guide | ~310 |
| `docs/SEMINAR_GUIDE.md` | This document | ~415 |

---

## 15. Closing Statement

> "TraceVigil AI transforms logistics from reactive to proactive. Instead of discovering problems after delivery, we detect them in real time, secure every data point with cryptographic hashes, and empower both administrators and drivers with the right information at the right time."

---

## Quick Stats to Mention

- **Packet frequency:** Every 3 seconds
- **Hash algorithm:** SHA-256 (same as Bitcoin)
- **Sensors:** 5 hardware modules
- **Database:** MongoDB with 18 fields per packet
- **Alerts:** 5 types (impact, spoilage, access denied, offline, tampered)
- **Response time:** 3-5 seconds from sensor send to dashboard polling
- **Offline capacity:** SPIFFS stores packets until synchronization; available capacity depends on flash usage and packet size

Good luck with your seminar!

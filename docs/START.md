# TraceVigil AI - Beginner Setup Guide

## What is TraceVigil AI?

TraceVigil AI is a smart logistics and cargo-safety system. It uses an ESP32 microcontroller with GPS, temperature, impact, and RFID hardware to monitor a shipment. Data is sent to a Node.js backend, stored in MongoDB, and displayed in a React dashboard.

The current spoilage logic is a temperature heuristic; the repository does not contain a trained machine-learning model.

## Folder Structure

```text
TraceVigil AI/
├── backend/                  Node.js + Express server
│   ├── middleware/auth.js    JWT role middleware
│   ├── models/               MongoDB schemas
│   ├── utils/sendAlert.js    Optional email alerts
│   ├── .env.example          Environment template
│   ├── package.json
│   ├── seed-dummy.js         Optional demo-data seeder
│   └── server.js
├── docs/
│   ├── assets/               Retained project screenshots
│   ├── SEMINAR_GUIDE.md
│   └── START.md
├── firmware/
│   ├── arduino/traceability.ino
│   └── platformio/
│       ├── platformio.ini
│       └── src/main.cpp
├── frontend/                 React + Vite frontend
│   ├── src/
│   ├── index.html
│   └── package.json
├── tests/
├── tools/
│   ├── requirements.txt
│   └── serial_bridge.py
├── .gitignore
└── README.md
```

---

## Step 1 - Install Required Software

1. **Node.js** - Download and install from https://nodejs.org (choose LTS version)
2. **MongoDB Community Server** - Download from https://www.mongodb.com/try/download/community
3. **MongoDB Compass** (GUI) - Download from https://www.mongodb.com/products/compass
4. **VS Code** - Download from https://code.visualstudio.com
5. **Arduino IDE** - Download from https://www.arduino.cc/en/software

---

## Step 2 - Arduino IDE Setup for ESP32

1. Open Arduino IDE
2. Go to **File > Preferences**
3. In **Additional Boards Manager URLs**, paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**
5. Go to **Tools > Board > Boards Manager...**
6. Search for **ESP32** and install **esp32 by Espressif Systems**
7. Install these libraries via **Sketch > Include Library > Manage Libraries...**:
   - `Adafruit MPU6050` by Adafruit
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
   - `TinyGPS++` by Mikal Hart
   - `MFRC522` by GithubCommunity

---

## Step 3 - Hardware Wiring

Connect everything to the ESP32 Dev Module according to this table:

### MPU6050
| MPU6050 | ESP32 |
|---------|-------|
| VCC     | 3V3   |
| GND     | GND   |
| SDA     | GPIO 21 |
| SCL     | GPIO 22 |

### DHT22
| DHT22   | ESP32 |
|---------|-------|
| VCC     | 3V3   |
| GND     | GND   |
| DATA    | GPIO 4 |

### GPS Neo-6M
| GPS     | ESP32 |
|---------|-------|
| VCC     | 3V3 or 5V |
| GND     | GND   |
| TX      | GPIO 16 |
| RX      | GPIO 17 |

### Buzzer
| Buzzer  | ESP32 |
|---------|-------|
| +       | GPIO 25 |
| -       | GND   |

### RC522 RFID
| RC522   | ESP32 |
|---------|-------|
| SDA/SS  | GPIO 5 |
| SCK     | GPIO 18 |
| MOSI    | GPIO 23 |
| MISO    | GPIO 19 |
| RST     | GPIO 27 |
| 3.3V    | 3V3   |
| GND     | GND   |

---

## Step 4 - Find Your Laptop's IP Address

The ESP32 needs to know where your backend server is running.

1. Open **PowerShell** on your laptop
2. Type:
   ```powershell
   ipconfig
   ```
3. Look for **IPv4 Address** under your WiFi adapter (usually starts with `192.168.`)
4. Write it down - it will look like `192.168.1.5`

---

## Step 5 - Configure the ESP32 Code

1. In VS Code (or Arduino IDE), open `firmware/arduino/traceability.ino`
2. Find these lines near the top and change them:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* SERVER_URL    = "http://192.168.1.5:5000";
   ```
3. Replace `YOUR_WIFI_SSID` with your WiFi name
4. Replace `YOUR_WIFI_PASSWORD` with your WiFi password
5. Replace `192.168.1.5` with the IP address you found in Step 4
6. **Keep the `:5000` at the end!**

---

## Step 6 - Run the Backend

1. Open a terminal in VS Code (Terminal > New Terminal)
2. Navigate to the backend folder:
   ```powershell
   cd backend
   ```
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Create the local environment file:
   ```powershell
   copy .env.example .env
   ```
   Edit `backend/.env` and set a strong `JWT_SECRET`. Never commit this file.
5. Make sure MongoDB is running:
   - Open MongoDB Compass and connect to `mongodb://127.0.0.1:27017`
   - If it fails, open Services app (type "Services" in Start menu), find MongoDB Server, and click Start
5. Start the backend:
   ```powershell
   npm start
   ```
6. You should see: `TraceVigil AI backend running on http://localhost:5000`

---

## Step 7 - Run the Frontend

1. Open a **second terminal** in VS Code
2. Navigate to the frontend folder:
   ```powershell
   cd frontend
   ```
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Start the dev server:
   ```powershell
   npm run dev
   ```
5. You will see a URL like `http://localhost:5173`
6. Press `Ctrl+Click` on the URL to open it in your browser

---

## Step 8 - Open Frontend on Your Phone

1. In `frontend/src/api.js`, change:
   ```js
   export const API_BASE = "http://localhost:5000";
   ```
   to your laptop's IP:
   ```js
   export const API_BASE = "http://192.168.1.5:5000";
   ```
2. Save the file
3. Make sure your phone is on the **same WiFi** as your laptop
4. On your phone browser, visit:
   ```
   http://192.168.1.5:5173
   ```
   (use your actual laptop IP, keep `:5173`)

---

## Step 9 - Create Your First Account

1. Open the frontend in your browser
2. Click **Need an account? Register**
3. Create an **admin** account:
   - Name: `Admin User`
   - Email: `admin@test.com`
   - Password: `admin123`
   - Role: `Admin`
4. Then log in with that account

---

## Step 10 - Upload ESP32 Firmware

1. In Arduino IDE, open `firmware/arduino/traceability.ino`
2. Select **Tools > Board > ESP32 Arduino > ESP32 Dev Module**
3. Select the correct **COM port** under Tools > Port
4. Select **Tools > Partition Scheme > Default 4MB with spiffs**
5. Click the **Upload** button (right arrow)
6. Open **Tools > Serial Monitor** and set baud rate to `115200`
7. You should see `SYSTEM READY - SENDING DATA EVERY 3s` and WiFi connection messages

---

## Testing Checklist

- [ ] ESP32 firmware compiles and uploads without errors
- [ ] Serial Monitor shows WiFi connected with an IP address
- [ ] Backend starts and shows `running on http://localhost:5000`
- [ ] Frontend opens in browser
- [ ] You can register a new admin account
- [ ] You can log in as admin and see the frontend
- [ ] Admin frontend shows live data cards when ESP32 is running
- [ ] Temperature trend chart appears and updates
- [ ] Impact trend chart appears and updates
- [ ] Recent packets table shows rows with hash values
- [ ] Driver account can log in and sees limited info
- [ ] RFID scan shows GRANTED for allowed cards
- [ ] RFID scan shows DENIED for unknown cards
- [ ] Unplug WiFi router temporarily - ESP32 saves to SPIFFS
- [ ] Reconnect WiFi - ESP32 syncs offline packets automatically
- [ ] Frontend looks good on phone browser (responsive)

---

## Common Problems

**Problem:** Backend says "MongoDB failed"
**Fix:** Open Services app, find MongoDB, and click Start.

**Problem:** Frontend shows "Network error"
**Fix:** Make sure backend is running on port 5000. Check `api.js` has the correct IP.

**Problem:** ESP32 cannot connect to WiFi
**Fix:** Double-check WIFI_SSID and WIFI_PASSWORD in the .ino file. Make sure they match exactly (case-sensitive).

**Problem:** No data appearing on frontend
**Fix:** Check Serial Monitor for errors. Make sure SERVER_URL in the ESP32 code uses your laptop's IP, not localhost.

**Problem:** GPS shows SEARCHING
**Fix:** GPS needs to see the sky. Place the module near a window. First fix can take 1-3 minutes.

---

## What Each File Does (Quick Reference)

| File | Purpose |
|------|---------|
| `backend/server.js` | Express server - handles login, receives sensor data, checks hashes |
| `backend/models/tracepacket.js` | Tells MongoDB how to store each sensor packet |
| `backend/middleware/auth.js` | Protects routes so only logged-in users can access them |
| `frontend/src/AdminDashboard.jsx` | Premium admin view with charts, live cards, alert banner |
| `frontend/src/DriverDashboard.jsx` | Simple mobile-friendly view for drivers |
| `frontend/src/loginpage.jsx` | Login and register screen |
| `firmware/arduino/traceability.ino` | Reads sensors, calculates hashes, sends data to backend |
| `backend/seed-dummy.js` | Clears and seeds demo trace and damage-event records |
| `backend/utils/sendAlert.js` | Sends optional email alerts through Nodemailer |
| `tools/serial_bridge.py` | Forwards canonical ESP32 JSON serial packets to the backend |
| `firmware/platformio/platformio.ini` | PlatformIO ESP32 build configuration |

---

## Technology Stack Summary

- **ESP32 Firmware:** Arduino C++ with MPU6050, DHT22, GPS, RFID, SPIFFS, SHA-256
- **Backend:** Node.js + Express + MongoDB + JWT + bcrypt + nodemailer
- **Frontend:** React 18 + Vite + Recharts (area charts) + Tailwind CSS + global CSS styling
- **Database:** MongoDB (local or cloud)
- **Security:** JWT tokens, SHA-256 hash chain tamper detection, role-based access

---

## Congratulations!

You now have a complete working smart logistics system. Show it to your lecturers with confidence!

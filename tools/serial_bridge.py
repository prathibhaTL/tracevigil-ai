"""Forward ESP32 serial packets to the TraceAbility backend."""

import json
import os
import re
import time

import requests
import serial

COM_PORT = os.getenv("SERIAL_PORT", "COM3")
BAUD_RATE = int(os.getenv("BAUD_RATE", "115200"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000/api/trace")


def parse_json_packet(line):
    if not line.startswith("[Packet] "):
        return None

    try:
        packet = json.loads(line[len("[Packet] ") :])
    except json.JSONDecodeError:
        return None

    required_fields = (
        "traceId",
        "latitude",
        "longitude",
        "impact",
        "temperature",
        "humidity",
        "spoilageMinutes",
        "status",
        "prevHash",
        "currHash",
    )
    if all(field in packet for field in required_fields):
        return packet
    return None


def parse_legacy_line(line):
    packet = {
        "traceId": "TRUCK-001",
        "driverName": "Ramesh Kumar",
        "owner": "Global Pharma Ltd",
        "product": "Vaccines",
        "threshold": 35.0,
        "segment": "Bengaluru-Mysore-Hwy",
        "latitude": "SEARCHING",
        "longitude": "SEARCHING",
        "impact": 9.8,
        "temperature": 26.5,
        "humidity": 55.0,
        "spoilageMinutes": 999.0,
        "status": "NORMAL",
        "rfidUid": "",
        "accessStatus": "NONE",
        "prevHash": None,
        "currHash": None,
    }

    location = re.search(r"Location:\s+([^,]+),\s+([^\s]+)", line)
    if location:
        packet["latitude"] = location.group(1).strip()
        packet["longitude"] = location.group(2).strip()

    numeric_fields = {
        "Temperature": "temperature",
        "Humidity": "humidity",
        "Impact": "impact",
        "Spoilage": "spoilageMinutes",
    }
    for label, key in numeric_fields.items():
        value = re.search(rf"{label}:\s+(-?\d+(?:\.\d+)?)", line)
        if value:
            packet[key] = float(value.group(1))

    status = re.search(r"Status:\s+(\S+)", line)
    if status:
        packet["status"] = status.group(1)

    access = re.search(r"Access:\s+(\S+)", line)
    if access:
        packet["accessStatus"] = access.group(1)

    return packet


def parse_line(line):
    return parse_json_packet(line) or parse_legacy_line(line)


def post_packet(session, packet):
    response = session.post(BACKEND_URL, json=packet, timeout=3)
    print(f"[SERVER] {response.status_code} - {response.text[:120]}\n")


def main():
    print(f"Opening {COM_PORT} at {BAUD_RATE} baud...")
    try:
        connection = serial.Serial(COM_PORT, BAUD_RATE, timeout=1)
    except Exception as exc:
        print(f"ERROR: Cannot open {COM_PORT}. Is Arduino Serial Monitor closed?")
        print(f"Exception: {exc}")
        return

    print(f"Connected to ESP32! Forwarding to {BACKEND_URL}")
    print("Press Ctrl+C to stop.\n")

    legacy_buffer = []
    last_post_time = 0
    session = requests.Session()
    try:
        while True:
            try:
                line = connection.readline().decode("utf-8", errors="ignore").strip()
            except Exception:
                continue

            if not line:
                continue

            print(f"[ESP32] {line}")
            packet = parse_json_packet(line)
            if packet:
                now = time.monotonic()
                if now - last_post_time >= 2:
                    try:
                        post_packet(session, packet)
                        last_post_time = now
                    except Exception as exc:
                        print(f"[SERVER] FAILED: {exc}\n")
                continue

            if "TRACEABILITY UPDATE" in line:
                legacy_buffer = []
            elif "------" in line and legacy_buffer:
                packet = parse_line(" ".join(legacy_buffer))
                if packet.get("prevHash") and packet.get("currHash"):
                    try:
                        post_packet(session, packet)
                    except Exception as exc:
                        print(f"[SERVER] FAILED: {exc}\n")
                legacy_buffer = []
            else:
                legacy_buffer.append(line)
    except KeyboardInterrupt:
        print("\nStopping serial bridge...")
    finally:
        connection.close()


if __name__ == "__main__":
    main()

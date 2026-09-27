const crypto = require("crypto");
const mongoose = require("mongoose");

const MONGODB_URI = "mongodb://127.0.0.1:27017/traceability";

const tracePacketSchema = new mongoose.Schema(
  {
    traceId: { type: String, required: true },
    driverName: { type: String, default: "" },
    owner: { type: String, default: "" },
    product: { type: String, default: "" },
    threshold: { type: Number, default: 35.0 },
    segment: { type: String, default: "" },
    latitude: { type: String, default: "SEARCHING" },
    longitude: { type: String, default: "SEARCHING" },
    impact: { type: Number, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    spoilageMinutes: { type: Number, required: true },
    status: { type: String, required: true },
    rfidUid: { type: String, default: "" },
    accessStatus: { type: String, default: "NONE" },
    prevHash: { type: String, required: true },
    currHash: { type: String, required: true },
    tampered: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const damageEventSchema = new mongoose.Schema(
  {
    traceId: { type: String, required: true },
    segment: { type: String, required: true },
    impact: { type: Number, required: true },
    latitude: { type: String, default: "SEARCHING" },
    longitude: { type: String, default: "SEARCHING" },
    driverName: { type: String, default: "" },
    product: { type: String, default: "" },
    status: { type: String, required: true },
  },
  { timestamps: true }
);

const TracePacket = mongoose.model("TracePacket", tracePacketSchema);
const DamageEvent = mongoose.model("DamageEvent", damageEventSchema);

function calculateHash(packet, prev) {
  const base =
    `ID:${packet.traceId}` +
    `|Driver:${packet.driverName || ""}` +
    `|Owner:${packet.owner || ""}` +
    `|Product:${packet.product || ""}` +
    `|Threshold:${Number(packet.threshold || 35).toFixed(2)}` +
    `|Segment:${packet.segment || ""}` +
    `|Lat:${packet.latitude}` +
    `|Lng:${packet.longitude}` +
    `|Impact:${Number(packet.impact).toFixed(2)}` +
    `|Temp:${Number(packet.temperature).toFixed(2)}` +
    `|Hum:${Number(packet.humidity).toFixed(2)}` +
    `|Spoilage:${Number(packet.spoilageMinutes).toFixed(2)}` +
    `|RFID:${packet.rfidUid || ""}` +
    `|Access:${packet.accessStatus || "NONE"}`;
  return crypto.createHash("sha256").update(base + prev).digest("hex");
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  await TracePacket.deleteMany({});
  await DamageEvent.deleteMany({});

  let prevHash = "genesis";
  const now = new Date();

  // Segments for testing hotspots
  const segments = [
    "Bengaluru-Mysore-Hwy",  // will have 4 damage events (hotspot)
    "Bengaluru-Mysore-Hwy",
    "Mysore-Ring-Rd",
    "Bengaluru-Mysore-Hwy",
    "Warehouse-Access",
    "Bengaluru-Mysore-Hwy",
    "Mysore-Ring-Rd",
    "Bengaluru-Mysore-Hwy",  // 4th damage event here
    "Highway-Exit-12",
    "Mysore-Ring-Rd",
    "Warehouse-Access",
    "Highway-Exit-12",
    "Bengaluru-Mysore-Hwy",
    "Mysore-Ring-Rd",
    "Warehouse-Access",
    "Highway-Exit-12",
    "Bengaluru-Mysore-Hwy",
    "Mysore-Ring-Rd",
    "Warehouse-Access",
    "Highway-Exit-12",
  ];

  // Generate 20 packets over the last 2 minutes with realistic data
  const packets = [];
  const damageEvents = [];

  for (let i = 19; i >= 0; i--) {
    const temp = 28 + Math.sin(i * 0.4) * 4 + (i > 15 ? (i - 15) * 1.5 : 0);
    // Higher impact for Bengaluru-Mysore-Hwy to create hotspot
    const segment = segments[19 - i];
    const isHotspotSegment = segment === "Bengaluru-Mysore-Hwy";
    const impact = 9.8 + Math.random() * 3 + (i === 5 ? 18 : 0) + (isHotspotSegment && i % 2 === 0 ? 4 : 0);
    const humidity = 55 + Math.random() * 10;
    const spoilage = temp > 35 ? Math.max(5, 120 - (temp - 35) * 15) : 999;

    let status = "NORMAL";
    let rfidUid = "";
    let accessStatus = "NONE";

    if (i === 5) {
      status = "IMPACT_ALERT";
    } else if (temp > 35) {
      status = "SPOILAGE_WARNING";
    } else if (i === 12) {
      status = "ACCESS_DENIED";
      rfidUid = "BAD00000";
      accessStatus = "DENIED";
    } else if (i === 14) {
      rfidUid = "A1B2C3D4";
      accessStatus = "GRANTED";
    } else if (i === 8) {
      status = "OFFLINE_MODE";
    }

    const lat = (12.97 + (20 - i) * 0.0001).toFixed(6);
    const lng = (77.59 + (20 - i) * 0.00005).toFixed(6);

    const payload = {
      traceId: "TRUCK-001",
      driverName: "Ramesh Kumar",
      owner: "Global Pharma Ltd",
      product: "Vaccines",
      threshold: 35.0,
      segment,
      latitude: lat,
      longitude: lng,
      impact: Number(impact.toFixed(2)),
      temperature: Number(temp.toFixed(2)),
      humidity: Number(humidity.toFixed(2)),
      spoilageMinutes: Number(spoilage.toFixed(2)),
      status,
      rfidUid,
      accessStatus,
      prevHash
    };

    const currHash = calculateHash(payload, prevHash);
    payload.currHash = currHash;
    payload.tampered = false;
    payload.createdAt = new Date(now.getTime() - i * 6000);

    packets.push(payload);
    prevHash = currHash;

    // Log damage event if impact > 5.0 (same logic as server)
    if (impact > 5.0 && segment !== "") {
      damageEvents.push({
        traceId: "TRUCK-001",
        segment,
        impact: Number(impact.toFixed(2)),
        latitude: lat,
        longitude: lng,
        driverName: "Ramesh Kumar",
        product: "Vaccines",
        status,
        createdAt: new Date(now.getTime() - i * 6000),
      });
    }
  }

  await TracePacket.insertMany(packets);
  await DamageEvent.insertMany(damageEvents);
  console.log(`Inserted ${packets.length} dummy packets.`);
  console.log(`Inserted ${damageEvents.length} damage events.`);

  // Show hotspot summary
  const hotspotSegments = {};
  for (const de of damageEvents) {
    hotspotSegments[de.segment] = (hotspotSegments[de.segment] || 0) + 1;
  }
  console.log("Damage events per segment:");
  for (const [seg, count] of Object.entries(hotspotSegments)) {
    console.log(`  ${seg}: ${count} ${count >= 3 ? "<<< HOTSPOT" : ""}`);
  }

  await mongoose.disconnect();
}

seed().catch(console.error);

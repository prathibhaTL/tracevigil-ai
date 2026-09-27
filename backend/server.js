const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const TracePacket = require("./models/tracepacket");
const DamageEvent = require("./models/damageEvent");
const User = require("./models/user");
const auth = require("./middleware/auth");
const sendAlert = require("./utils/sendAlert");

const app = express();
app.use(cors());
app.use(express.json());

const requireAuth = auth();
const requireAdmin = auth(["admin"]);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/traceability";
const JWT_SECRET = process.env.JWT_SECRET;

function calculateHashFromPacket(packet) {
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

  return crypto.createHash("sha256").update(base + packet.prevHash).digest("hex");
}

async function countDamageEvents(segment) {
  return await DamageEvent.countDocuments({ segment });
}

async function checkAndFlagHotspot(segment) {
  const count = await countDamageEvents(segment);
  if (count >= 3) {
    return { isHotspot: true, count };
  }
  return { isHotspot: false, count };
}

app.get("/", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    if (!["admin", "driver"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: "User exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });

    res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, message: "JWT secret is not configured" });
    }

    const token = jwt.sign(
      { userId: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/trace", async (req, res) => {
  try {
    const payload = req.body;
    const recalculatedHash = calculateHashFromPacket(payload);
    const tampered = recalculatedHash !== payload.currHash;

    const packet = await TracePacket.create({ ...payload, tampered });

    // Log damage event if impact is high or status is alert
    if (packet.impact > 5.0 || packet.status === "IMPACT_ALERT" || tampered) {
      if (packet.segment && packet.segment !== "") {
        await DamageEvent.create({
          traceId: packet.traceId,
          segment: packet.segment,
          impact: packet.impact,
          latitude: packet.latitude,
          longitude: packet.longitude,
          driverName: packet.driverName,
          product: packet.product,
          status: packet.status,
        });
      }
    }

    if (
      tampered ||
      packet.status === "IMPACT_ALERT" ||
      packet.status === "SPOILAGE_WARNING" ||
      packet.status === "ACCESS_DENIED" ||
      packet.status === "OFFLINE_MODE"
    ) {
      sendAlert(packet);
    }

    res.status(201).json({ success: true, packet, tampered });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get("/api/trace", requireAdmin, async (_req, res) => {
  const packets = await TracePacket.find().sort({ createdAt: -1 }).limit(100);
  res.json(packets);
});

app.get("/api/trace/latest", requireAdmin, async (_req, res) => {
  const packet = await TracePacket.findOne().sort({ createdAt: -1 });
  res.json(packet);
});

app.get("/api/trace/driver/latest", requireAuth, async (_req, res) => {
  const packet = await TracePacket.findOne().sort({ createdAt: -1 });
  if (!packet) return res.json(null);

  res.json({
    traceId: packet.traceId,
    latitude: packet.latitude,
    longitude: packet.longitude,
    status: packet.status,
    accessStatus: packet.accessStatus,
    createdAt: packet.createdAt
  });
});

app.get("/api/hotspots", requireAdmin, async (_req, res) => {
  try {
    const hotspots = await DamageEvent.aggregate([
      { $match: { segment: { $ne: "" } } },
      {
        $group: {
          _id: "$segment",
          count: { $sum: 1 },
          lastEvent: { $max: "$createdAt" },
          maxImpact: { $max: "$impact" },
          latitude: { $last: "$latitude" },
          longitude: { $last: "$longitude" },
          driverName: { $last: "$driverName" },
          product: { $last: "$product" },
        },
      },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
    ]);

    res.json(hotspots.map((h) => ({
      segment: h._id,
      count: h.count,
      lastEvent: h.lastEvent,
      maxImpact: h.maxImpact,
      latitude: h.latitude,
      longitude: h.longitude,
      driverName: h.driverName,
      product: h.product,
      isHotspot: true,
    })));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get("/api/damage-events", requireAdmin, async (_req, res) => {
  try {
    const events = await DamageEvent.find().sort({ createdAt: -1 }).limit(100);
    res.json(events);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`TraceVigil AI backend running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error("MongoDB failed:", err.message));
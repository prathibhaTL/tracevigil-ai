const mongoose = require("mongoose");

const tracePacketSchema = new mongoose.Schema(
  {
    traceId: { type: String, required: true },
    driverName: { type: String, default: "" },
    owner: { type: String, default: "" },
    product: { type: String, default: "" },
    threshold: { type: Number, default: 35.0 },
    latitude: { type: String, default: "SEARCHING" },
    longitude: { type: String, default: "SEARCHING" },
    impact: { type: Number, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    spoilageMinutes: { type: Number, required: true },
    status: { type: String, required: true },
    segment: { type: String, default: "" },
    rfidUid: { type: String, default: "" },
    accessStatus: { type: String, default: "NONE" },
    prevHash: { type: String, required: true },
    currHash: { type: String, required: true },
    tampered: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TracePacket", tracePacketSchema);
const mongoose = require("mongoose");

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

module.exports = mongoose.model("DamageEvent", damageEventSchema);

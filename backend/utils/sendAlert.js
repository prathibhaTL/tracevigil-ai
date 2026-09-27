const nodemailer = require("nodemailer");

async function sendAlert(packet) {
  if (process.env.ALERT_EMAIL_ENABLED !== "true") return;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ALERT_EMAIL_FROM,
        pass: process.env.ALERT_EMAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM,
      to: process.env.ALERT_EMAIL_TO,
      subject: `TraceAbility Alert: ${packet.status}`,
      text: [
        `Trace ID: ${packet.traceId}`,
        `Status: ${packet.status}`,
        `Location: ${packet.latitude}, ${packet.longitude}`,
        `Impact: ${packet.impact}`,
        `Temperature: ${packet.temperature}`,
        `Humidity: ${packet.humidity}`,
        `Spoilage Minutes: ${packet.spoilageMinutes}`,
        `RFID UID: ${packet.rfidUid || "NONE"}`,
        `Access: ${packet.accessStatus || "NONE"}`,
        `Tampered: ${packet.tampered ? "YES" : "NO"}`
      ].join("\n")
    });
  } catch (err) {
    console.error("Alert email failed:", err.message);
  }
}

module.exports = sendAlert;

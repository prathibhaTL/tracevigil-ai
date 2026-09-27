import { useEffect, useState } from "react";
import { API_BASE, authHeaders } from "./api";

const neon = {
  blue: "#0ea5e9",
  orange: "#f97316",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  pink: "#ec4899"
};

function statusColor(status) {
  if (status === "IMPACT_ALERT") return neon.orange;
  if (status === "SPOILAGE_WARNING") return neon.red;
  if (status === "ACCESS_DENIED") return neon.pink;
  if (status === "OFFLINE_MODE") return neon.yellow;
  return neon.green;
}

function Card({ label, value, color, icon }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.95))",
        padding: "18px",
        borderRadius: "16px",
        border: `1px solid ${color}44`,
        boxShadow: `0 0 16px ${color}18, 0 8px 24px rgba(0,0,0,0.3)`,
        display: "flex",
        alignItems: "center",
        gap: 14
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>{value}</div>
      </div>
    </div>
  );
}

export default function DriverDashboard({ onLogout }) {
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/trace/driver/latest`, {
          headers: authHeaders()
        });
        setLatest(await res.json());
      } catch {
        // silent fail, retry on interval
      }
    };

    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const sColor = latest ? statusColor(latest.status) : neon.green;

  return (
    <div
      style={{
        padding: "20px",
        minHeight: "100vh",
        color: "#e2e8f0",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        background:
          "radial-gradient(circle at 80% 20%, rgba(14,165,233,0.12), transparent 30%), radial-gradient(circle at 20% 80%, rgba(249,115,22,0.10), transparent 28%), linear-gradient(180deg, #020617, #0b1221 50%, #020617)"
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 800 }}>
            Driver View
          </h1>
          <button
            onClick={onLogout}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
        <p style={{ margin: "6px 0 20px 0", color: "#94a3b8", fontSize: 14 }}>
          Limited shipment information for on-road access.
        </p>

        {latest && (
          <div style={{ display: "grid", gap: 14 }}>
            <Card label="Truck ID" value={latest.traceId} color={neon.blue} icon="🚛" />
            <Card label="Location" value={`${latest.latitude}, ${latest.longitude}`} color={neon.blue} icon="📍" />
            <Card label="Status" value={latest.status.replace(/_/g, " ")} color={sColor} icon="📡" />
            <Card label="RFID Access" value={latest.accessStatus} color={neon.green} icon="👾" />
            <Card
              label="Last Updated"
              value={latest.createdAt ? new Date(latest.createdAt).toLocaleString() : "--"}
              color={neon.yellow}
              icon="🕐"
            />
          </div>
        )}

        {!latest && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚛</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>No active shipment data</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Waiting for the next packet from the vehicle.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

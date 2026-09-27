import { useEffect, useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { jsPDF } from "jspdf";
import {
  Hexagon,
  Home,
  Truck,
  Package,
  FileText,
  Shield,
  AlertTriangle,
  MapPin,
  Thermometer,
  Activity,
  Wifi,
  Database,
  Radio,
  Cpu,
  Download,
  User,
  Star,
  TrendingUp,
  Zap,
  Lock,
  Unlock,
  Flame,
} from "lucide-react";
import { API_BASE, authHeaders } from "./api";

// ===================== HELPERS =====================
function statusColor(status, tampered) {
  if (tampered) return "#ef4444";
  if (status === "IMPACT_ALERT") return "#f97316";
  if (status === "SPOILAGE_WARNING") return "#ef4444";
  if (status === "ACCESS_DENIED") return "#ec4899";
  if (status === "OFFLINE_MODE") return "#eab308";
  return "#22c55e";
}

function statusText(status, tampered) {
  if (tampered) return "TAMPERED";
  return status.replace(/_/g, " ");
}

function formatTime(d) {
  if (!d) return "--";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ===================== GAUGE COMPONENT =====================
function Gauge({ value, max, label, unit, color, threshold }) {
  const pct = Math.min(value / max, 1);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - pct * 0.75);
  const isOverThreshold = threshold && value > threshold;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-36 h-24">
        <svg viewBox="0 0 100 60" className="w-full h-full">
          <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke={isOverThreshold ? "#ef4444" : color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference * 0.75}
            strokeDashoffset={offset}
            className="gauge-animate"
            style={{ filter: `drop-shadow(0 0 6px ${isOverThreshold ? "#ef4444" : color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`text-2xl font-bold font-mono ${isOverThreshold ? "text-red-400" : "text-white"}`} style={{ textShadow: `0 0 10px ${isOverThreshold ? "#ef4444" : color}` }}>
            {value.toFixed(1)}
            <span className="text-sm ml-0.5">{unit}</span>
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-400 uppercase tracking-wider mt-2">{label}</span>
      {threshold && (
        <span className="text-[10px] text-slate-500 mt-0.5">THRESHOLD AT {threshold}{unit}</span>
      )}
    </div>
  );
}

// ===================== STAR RATING =====================
function StarRating({ rating, max = 5 }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={18}
          className={i < rating ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" : "text-slate-700"}
        />
      ))}
    </div>
  );
}

// ===================== SIDEBAR ICON =====================
function SidebarIcon({ icon: Icon, active, label, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`group flex flex-col items-center gap-1 p-3 rounded-xl cursor-pointer transition-all ${active ? "bg-cyan-500/10" : "hover:bg-white/5"}`}
    >
      <Icon
        size={22}
        className={`transition-all ${active ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "text-slate-500 group-hover:text-slate-300"}`}
      />
      <span className={`text-[9px] uppercase tracking-wider ${active ? "text-cyan-400" : "text-slate-600 group-hover:text-slate-400"}`}>{label}</span>
    </div>
  );
}

// ===================== PANEL WRAPPER =====================
function Panel({ children, className = "", title, icon: Icon, accent = "cyan" }) {
  const accentColor = accent === "red" ? "border-red-500/30" : accent === "green" ? "border-green-500/30" : "border-cyan-500/30";
  const glowColor = accent === "red" ? "shadow-red" : accent === "green" ? "shadow-green" : "shadow-cyan";

  return (
    <div className={`bg-cyber-panel/80 backdrop-blur-sm border ${accentColor} rounded-xl p-4 ${glowColor} ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          {Icon && <Icon size={14} className={accent === "red" ? "text-red-400" : accent === "green" ? "text-green-400" : "text-cyan-400"} />}
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

// ===================== MAIN DASHBOARD =====================
export default function AdminDashboard({ onLogout }) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [session] = useState(() => {
    const raw = localStorage.getItem("traceability-session");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [a, b, c] = await Promise.all([
          fetch(`${API_BASE}/api/trace/latest`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/trace`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/hotspots`, { headers: authHeaders() }),
        ]);
        setLatest(await a.json());
        setHistory(await b.json());
        setHotspots(await c.json());
      } catch {
        // silent
      }
    };
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const chartData = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history
      .slice(0, 20)
      .reverse()
      .map((p, i) => ({
        idx: i,
        temperature: Number(p.temperature || 0),
        impact: Number(p.impact || 0),
        humidity: Number(p.humidity || 0),
        spoilage: Number(p.spoilageMinutes || 0),
      }));
  }, [history]);

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("TraceAbility Compliance Audit Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Shipment: ${latest?.traceId || "N/A"}`, 14, 36);

    let y = 50;
    doc.setFontSize(9);
    doc.text("Time", 14, y);
    doc.text("Latitude", 50, y);
    doc.text("Longitude", 90, y);
    doc.text("Temp", 130, y);
    doc.text("Vibration", 155, y);
    doc.text("Status", 185, y);
    doc.text("Hash", 220, y);
    y += 8;

    (history || []).slice(0, 30).forEach((p) => {
      if (y > 180) {
        doc.addPage();
        y = 20;
      }
      doc.text(formatTime(p.createdAt), 14, y);
      doc.text(String(p.latitude || "").slice(0, 12), 50, y);
      doc.text(String(p.longitude || "").slice(0, 12), 90, y);
      doc.text(`${p.temperature?.toFixed(1)}C`, 130, y);
      doc.text(`${p.impact?.toFixed(1)}g`, 155, y);
      doc.text(p.tampered ? "VOID" : p.status === "NORMAL" ? "SECURE" : "COMPROMISED", 185, y);
      doc.text(p.currHash?.slice(0, 16) + "...", 220, y);
      y += 6;
    });

    doc.save(`TraceAbility_Audit_${latest?.traceId || "Report"}.pdf`);
  };

  const sColor = latest ? statusColor(latest.status, latest.tampered) : "#22c55e";
  const sLabel = latest ? statusText(latest.status, latest.tampered) : "LOADING";

  // Mock alert data derived from actual packets
  const alerts = useMemo(() => {
    const out = [];
    if (latest?.status === "IMPACT_ALERT") out.push({ text: `IMPACT DETECTED on ${latest.traceId}`, time: "Just now", critical: true });
    if (latest?.status === "SPOILAGE_WARNING") out.push({ text: `SPOILAGE WARNING for ${latest.traceId}`, time: "Just now", critical: true });
    if (latest?.tampered) out.push({ text: `TAMPER DETECTED - Hash mismatch!`, time: "Just now", critical: true });
    if (latest?.status === "ACCESS_DENIED") out.push({ text: `Unauthorized RFID access attempt`, time: "Just now", critical: true });
    if (latest?.spoilageMinutes < 60 && latest?.spoilageMinutes > 0) {
      out.push({ text: `${latest.traceId} integrity compromise predicted within ${latest.spoilageMinutes.toFixed(0)} mins`, time: "Predictive", critical: true });
    }
    if (out.length === 0) {
      out.push({ text: "All systems nominal", time: "Live", critical: false });
    }
    return out;
  }, [latest]);

  return (
    <div className="min-h-screen bg-black p-2 md:p-6 font-sans">
      {/* Monitor Bezel */}
      <div className="monitor-bezel max-w-[1600px] mx-auto min-h-[90vh] flex flex-col">
        <div className="scanline-overlay" />

        {/* ========== HEADER ========== */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60 bg-gradient-to-r from-slate-900/80 to-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Hexagon size={32} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" strokeWidth={2} />
              <span className="absolute inset-0 flex items-center justify-center text-cyan-300 font-bold text-sm">T</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">TraceAbility</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Logistics Command Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
              <Database size={12} className="text-green-400" />
              <span className="text-[10px] text-green-400 font-mono">MongoDB Atlas</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Wifi size={12} className="text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-mono">React Live</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <MapPin size={12} className="text-blue-400" />
              <span className="text-[10px] text-blue-400 font-mono">Maps API</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Cpu size={12} className="text-orange-400" />
              <span className="text-[10px] text-orange-400 font-mono">PlatformIO</span>
            </div>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
            >
              <FileText size={12} className="text-red-400" />
              <span className="text-[10px] text-red-400 font-mono font-semibold">PDF Audit</span>
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ========== SIDEBAR ========== */}
          <aside className="w-20 border-r border-slate-800/60 bg-slate-900/40 flex flex-col items-center py-4 gap-2">
            <SidebarIcon icon={Home} active={activeTab === "home"} label="Home" onClick={() => setActiveTab("home")} />
            <SidebarIcon icon={Truck} active={activeTab === "vehicles"} label="Vehicles" onClick={() => setActiveTab("vehicles")} />
            <SidebarIcon icon={Package} active={activeTab === "shipments"} label="Shipments" onClick={() => setActiveTab("shipments")} />
            <SidebarIcon icon={FileText} active={activeTab === "logs"} label="Logs" onClick={() => setActiveTab("logs")} />
            <SidebarIcon icon={Shield} active={activeTab === "admin"} label="Admin" onClick={() => setActiveTab("admin")} />
            <div className="mt-auto flex flex-col items-center gap-2 pb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                {session?.user?.name?.[0] || "A"}
              </div>
              <span className="text-[8px] text-slate-600 uppercase">{session?.user?.role || "admin"}</span>
              <button
                onClick={onLogout}
                className="mt-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-[9px] text-red-400 uppercase tracking-wider hover:bg-red-500/20 transition-colors"
              >
                Logout
              </button>
            </div>
          </aside>

          {/* ========== MAIN CONTENT ========== */}
          <main className="flex-1 p-4 overflow-y-auto">
            {activeTab === "home" && (
            <>
            {/* ----- ROW 1 ----- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
              {/* Shipment Flow */}
              <Panel title="Shipment Flow" icon={Package} className="lg:col-span-3" accent="cyan">
                <div className="flex flex-col gap-3 py-2">
                  {[
                    { label: "Warehouse", done: true },
                    { label: "In Transit", done: latest?.status !== "OFFLINE_MODE", active: true },
                    { label: "Hospital", done: false },
                  ].map((step, i, arr) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                        step.done
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : step.active
                          ? "bg-yellow-500/20 border-yellow-400 text-yellow-300 animate-pulse"
                          : "bg-slate-800 border-slate-700 text-slate-600"
                      }`}>
                        {step.done ? "✓" : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className={`text-xs font-semibold ${step.done || step.active ? "text-slate-200" : "text-slate-600"}`}>
                          {step.label}
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`h-4 w-0.5 ml-4 mt-1 ${step.done ? "bg-cyan-500/40" : "bg-slate-800"}`} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Map */}
              <Panel title="Shipment Tracker" icon={MapPin} className="lg:col-span-6" accent="blue">
                <div className="relative h-48 rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                  {/* Dark map grid pattern */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  {/* Route polyline */}
                  <svg className="absolute inset-0 w-full h-full">
                    <polyline
                      points="40,160 80,140 140,110 200,90 280,70 360,50"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      style={{ filter: "drop-shadow(0 0 4px rgba(6,182,212,0.5))" }}
                    />
                    {/* Hotspot route segment highlight */}
                    {hotspots.length > 0 && (
                      <polyline
                        points="80,140 140,110 200,90"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="4"
                        strokeDasharray="8 4"
                        opacity="0.6"
                        style={{ filter: "drop-shadow(0 0 6px rgba(239,68,68,0.8))" }}
                      >
                        <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
                      </polyline>
                    )}
                    {/* Start marker */}
                    <circle cx="40" cy="160" r="5" fill="#22c55e" />
                    {/* Current position */}
                    <circle cx="200" cy="90" r="6" fill="#06b6d4" style={{ filter: "drop-shadow(0 0 8px #06b6d4)" }}>
                      <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
                    </circle>
                    {/* End marker */}
                    <circle cx="360" cy="50" r="5" fill="#64748b" />
                    {/* Hotspot markers */}
                    {hotspots.map((h, idx) => (
                      <g key={idx} transform={`translate(${120 + idx * 40}, ${125 - idx * 10})`}>
                        <circle r="10" fill="#ef4444" opacity="0.3">
                          <animate attributeName="r" values="10;16;10" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                        <circle r="5" fill="#ef4444" />
                      </g>
                    ))}
                    {/* Alert marker */}
                    {latest?.status === "IMPACT_ALERT" && (
                      <g transform="translate(140, 110)">
                        <circle r="8" fill="#ef4444" opacity="0.3">
                          <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                        <circle r="4" fill="#ef4444" />
                      </g>
                    )}
                  </svg>
                  {/* Map labels */}
                  <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 font-mono">Bengaluru, IN</div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 border border-cyan-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] text-cyan-300 font-mono">LIVE</span>
                  </div>
                  {/* Hotspot tooltip panel */}
                  {hotspots.length > 0 && (
                    <div className="absolute bottom-2 right-2 max-w-[200px]">
                      <div className="px-2 py-1.5 rounded-lg bg-red-950/90 border border-red-500/40">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Flame size={10} className="text-red-400" />
                          <span className="text-[10px] text-red-300 font-bold uppercase tracking-wider">Damage Hotspots</span>
                        </div>
                        {hotspots.map((h, i) => (
                          <div key={i} className="text-[9px] text-red-200 leading-relaxed">
                            <span className="font-semibold">{h.segment}</span> — {h.count} damage events. Marked as hotspot.
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {latest?.status === "IMPACT_ALERT" && (
                    <div className="absolute top-10 left-24 px-2 py-1 rounded bg-red-950/80 border border-red-500/40 text-[10px] text-red-300 font-mono">
                      <AlertTriangle size={10} className="inline mr-1" />
                      Shock Impact! Temp Spike!
                    </div>
                  )}
                </div>
              </Panel>

              {/* Alerts */}
              <Panel title="Predictive Alerts" icon={AlertTriangle} className="lg:col-span-3" accent="red">
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border ${
                        alert.critical
                          ? "bg-red-950/30 border-red-500/30"
                          : "bg-green-950/30 border-green-500/30"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {alert.critical ? (
                          <Zap size={12} className="text-red-400 mt-0.5 shrink-0" />
                        ) : (
                          <Shield size={12} className="text-green-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className={`text-[11px] font-semibold leading-tight ${alert.critical ? "text-red-300" : "text-green-300"}`}>
                            {alert.text}
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{alert.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* ----- ROW 2 ----- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
              {/* Shipment Details */}
              <Panel title="Active Shipment" icon={Package} className="lg:col-span-4" accent="cyan">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Truck size={24} className="text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-white font-mono">{latest?.traceId || "--"}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px]">
                      <div className="text-slate-500">Owner</div>
                      <div className="text-slate-300 truncate">{latest?.owner || "--"}</div>
                      <div className="text-slate-500">Driver</div>
                      <div className="text-slate-300">{latest?.driverName || "--"}</div>
                      <div className="text-slate-500">Product</div>
                      <div className="text-slate-300">{latest?.product || "--"}</div>
                      <div className="text-slate-500">Threshold</div>
                      <div className="text-cyan-400 font-mono">{latest?.threshold != null ? `${latest.threshold.toFixed(1)}°C` : "35.0°C"}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                      <User size={12} className="text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-500">Driver Online</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-green-400">Tracking Active</span>
                  </div>
                </div>
              </Panel>

              {/* Driver Rating */}
              <Panel title="Driver Rating" icon={User} className="lg:col-span-4" accent="yellow">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm text-slate-300">{latest?.driverName || "Driver"}</div>
                    <div className="text-[10px] text-slate-500">Performance this trip</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-400 font-mono">2/5</div>
                    <StarRating rating={2} />
                  </div>
                </div>
                <div className="h-24 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.slice(-8)}>
                      <Line
                        type="monotone"
                        dataKey="impact"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* Quick Stats */}
              <Panel title="Live Telemetry" icon={Activity} className="lg:col-span-4" accent="green">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Latitude</div>
                    <div className="text-sm font-mono text-cyan-300 mt-1">{latest?.latitude || "--"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Longitude</div>
                    <div className="text-sm font-mono text-cyan-300 mt-1">{latest?.longitude || "--"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">RFID Access</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {latest?.accessStatus === "GRANTED" ? (
                        <Unlock size={12} className="text-green-400" />
                      ) : latest?.accessStatus === "DENIED" ? (
                        <Lock size={12} className="text-red-400" />
                      ) : (
                        <Shield size={12} className="text-slate-500" />
                      )}
                      <span className={`text-sm font-mono ${latest?.accessStatus === "GRANTED" ? "text-green-400" : latest?.accessStatus === "DENIED" ? "text-red-400" : "text-slate-500"}`}>
                        {latest?.accessStatus || "NONE"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Hash Chain</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                      {latest?.currHash?.slice(0, 14)}...
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            {/* ----- ROW 3 ----- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Audit Log Table */}
              <Panel title="Live Audit Log" icon={FileText} className="lg:col-span-5" accent="cyan">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="text-left py-2 pr-3 font-medium uppercase tracking-wider">Time</th>
                        <th className="text-left py-2 pr-3 font-medium uppercase tracking-wider">Lat</th>
                        <th className="text-left py-2 pr-3 font-medium uppercase tracking-wider">Lng</th>
                        <th className="text-left py-2 pr-3 font-medium uppercase tracking-wider">Temp</th>
                        <th className="text-left py-2 pr-3 font-medium uppercase tracking-wider">Vib</th>
                        <th className="text-left py-2 font-medium uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(history || []).slice(0, 8).map((p) => {
                        const isCompromised = p.tampered || p.status !== "NORMAL";
                        return (
                          <tr key={p._id} className="border-b border-slate-800/50 hover:bg-white/[0.02]">
                            <td className="py-2 pr-3 text-slate-400 font-mono whitespace-nowrap">{formatTime(p.createdAt)}</td>
                            <td className="py-2 pr-3 text-slate-500 font-mono">{String(p.latitude || "").slice(0, 8)}</td>
                            <td className="py-2 pr-3 text-slate-500 font-mono">{String(p.longitude || "").slice(0, 8)}</td>
                            <td className={`py-2 pr-3 font-mono font-semibold ${p.temperature > 35 ? "text-red-400" : "text-cyan-300"}`}>
                              {p.temperature?.toFixed(1)}°C
                            </td>
                            <td className={`py-2 pr-3 font-mono font-semibold ${p.impact > 15 ? "text-red-400" : "text-cyan-300"}`}>
                              {p.impact?.toFixed(1)}g
                            </td>
                            <td className="py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  isCompromised
                                    ? "bg-red-950/60 text-red-400 border border-red-500/30"
                                    : "bg-green-950/60 text-green-400 border border-green-500/30"
                                }`}
                              >
                                {isCompromised ? "VOID" : "SECURE"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={downloadPDF}
                  className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider hover:from-cyan-600/30 hover:to-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  Download Compliance PDF Report
                </button>
              </Panel>

              {/* Live Gauges */}
              <Panel title="Live Gauges" icon={Activity} className="lg:col-span-3" accent="cyan">
                <div className="flex flex-col items-center gap-4">
                  <Gauge
                    value={latest?.temperature || 0}
                    max={50}
                    label="Live Temperature"
                    unit="°C"
                    color="#06b6d4"
                    threshold={latest?.threshold || 35}
                  />
                  <div className="w-full h-px bg-slate-800" />
                  <Gauge
                    value={latest?.impact || 0}
                    max={30}
                    label="Live Vibration"
                    unit="g"
                    color="#0ea5e9"
                    threshold={15}
                  />
                </div>
              </Panel>

              {/* Trend Prediction */}
              <Panel title="Trend Prediction" icon={TrendingUp} className="lg:col-span-4" accent="orange">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="idx" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                      <ReferenceLine y={35} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                      <Area
                        type="monotone"
                        dataKey="temperature"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#tempGrad)"
                        dot={{ r: 2, fill: "#ef4444" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 p-2 rounded-lg bg-red-950/20 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-red-400 shrink-0" />
                    <span className="text-[10px] text-red-300">
                      {latest?.product || latest?.traceId || "Shipment"} integrity compromise predicted within{" "}
                      {latest?.spoilageMinutes && latest.spoilageMinutes < 999
                        ? `${latest.spoilageMinutes.toFixed(1)} mins`
                        : "stable window"}
                    </span>
                  </div>
                </div>
              </Panel>
            </div>
            </>
            )}

            {/* ===== VEHICLES TAB ===== */}
            {activeTab === "vehicles" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Truck size={20} className="text-cyan-400" /> Fleet Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(new Set(history.map((h) => h.traceId))).map((id) => {
                    const truckLatest = history.find((h) => h.traceId === id);
                    return (
                      <div key={id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-cyan-400 font-mono font-bold">{id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            truckLatest?.status === "NORMAL" ? "bg-green-500/10 text-green-400" :
                            truckLatest?.status === "WARNING" ? "bg-yellow-500/10 text-yellow-400" :
                            "bg-red-500/10 text-red-400"
                          }`}>{truckLatest?.status || "UNKNOWN"}</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-slate-400">
                          <div className="flex justify-between"><span>Driver</span><span className="text-slate-200">{truckLatest?.driverName || "--"}</span></div>
                          <div className="flex justify-between"><span>Product</span><span className="text-slate-200">{truckLatest?.product || "--"}</span></div>
                          <div className="flex justify-between"><span>Owner</span><span className="text-slate-200">{truckLatest?.owner || "--"}</span></div>
                          <div className="flex justify-between"><span>Last Temp</span><span className="text-cyan-300">{truckLatest?.temperature?.toFixed(1)}°C</span></div>
                          <div className="flex justify-between"><span>Location</span><span className="text-slate-200">{truckLatest?.latitude !== "SEARCHING" ? `${truckLatest?.latitude}, ${truckLatest?.longitude}` : "Acquiring..."}</span></div>
                        </div>
                      </div>
                    );
                  })}
                  {history.length === 0 && (
                    <div className="col-span-full p-8 text-center text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
                      No vehicle data available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== SHIPMENTS TAB ===== */}
            {activeTab === "shipments" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package size={20} className="text-cyan-400" /> Active Shipments
                </h2>
                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase">
                      <tr>
                        <th className="text-left p-3">Trace ID</th>
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">Owner</th>
                        <th className="text-left p-3">Driver</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Temp</th>
                        <th className="text-left p-3">Spoilage</th>
                        <th className="text-left p-3">Hash Verified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {history.slice(0, 30).map((pkt, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-mono text-cyan-300">{pkt.traceId}</td>
                          <td className="p-3 text-slate-200">{pkt.product || "--"}</td>
                          <td className="p-3 text-slate-200">{pkt.owner || "--"}</td>
                          <td className="p-3 text-slate-200">{pkt.driverName || "--"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              pkt.status === "NORMAL" ? "bg-green-500/10 text-green-400" :
                              pkt.status === "WARNING" ? "bg-yellow-500/10 text-yellow-400" :
                              "bg-red-500/10 text-red-400"
                            }`}>{pkt.status}</span>
                          </td>
                          <td className="p-3 font-mono">{pkt.temperature?.toFixed(1)}°C</td>
                          <td className="p-3 font-mono">{pkt.spoilageMinutes?.toFixed(1)}m</td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded ${pkt.tampered ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                              {pkt.tampered ? "TAMPERED" : "OK"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-500">No shipment records</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== LOGS TAB ===== */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText size={20} className="text-cyan-400" /> Audit Log
                </h2>
                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                  <table className="w-full text-[10px] font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase text-[9px]">
                      <tr>
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Trace ID</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Impact</th>
                        <th className="text-left p-2">Temp</th>
                        <th className="text-left p-2">Humidity</th>
                        <th className="text-left p-2">RFID</th>
                        <th className="text-left p-2">Access</th>
                        <th className="text-left p-2">Tampered</th>
                        <th className="text-left p-2">Previous Hash</th>
                        <th className="text-left p-2">Current Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {history.map((pkt, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-2 text-slate-400 whitespace-nowrap">{new Date(pkt.createdAt).toLocaleString()}</td>
                          <td className="p-2 text-cyan-300">{pkt.traceId}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded ${
                              pkt.status === "NORMAL" ? "bg-green-500/10 text-green-400" :
                              pkt.status === "WARNING" ? "bg-yellow-500/10 text-yellow-400" :
                              "bg-red-500/10 text-red-400"
                            }`}>{pkt.status}</span>
                          </td>
                          <td className="p-2">{pkt.impact?.toFixed(2)}g</td>
                          <td className="p-2">{pkt.temperature?.toFixed(1)}°C</td>
                          <td className="p-2">{pkt.humidity?.toFixed(1)}%</td>
                          <td className="p-2">{pkt.rfidUid || "--"}</td>
                          <td className="p-2">{pkt.accessStatus || "--"}</td>
                          <td className="p-2">
                            <span className={pkt.tampered ? "text-red-400" : "text-green-400"}>{pkt.tampered ? "YES" : "NO"}</span>
                          </td>
                          <td className="p-2 text-slate-500 truncate max-w-[80px]">{pkt.prevHash?.slice(0, 12)}...</td>
                          <td className="p-2 text-slate-500 truncate max-w-[80px]">{pkt.currHash?.slice(0, 12)}...</td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr><td colSpan={11} className="p-8 text-center text-slate-500">No log entries</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== ADMIN TAB ===== */}
            {activeTab === "admin" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield size={20} className="text-cyan-400" /> System Administration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Panel title="Logged In User" icon={User} accent="cyan">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="text-white">{session?.user?.name || "Admin"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="text-white">{session?.user?.email || "admin@trace.local"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Role</span><span className="text-cyan-400 uppercase">{session?.user?.role || "admin"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Session ID</span><span className="text-slate-500 font-mono text-xs">{session?.token?.slice(0, 16)}...</span></div>
                    </div>
                  </Panel>
                  <Panel title="Database Stats" icon={Database} accent="green">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Total Packets</span><span className="text-white font-mono">{history.length}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Unique Trucks</span><span className="text-white font-mono">{new Set(history.map((h) => h.traceId)).size}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Normal</span><span className="text-green-400 font-mono">{history.filter((h) => h.status === "NORMAL").length}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Warnings</span><span className="text-yellow-400 font-mono">{history.filter((h) => h.status === "WARNING").length}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Critical</span><span className="text-red-400 font-mono">{history.filter((h) => h.status === "CRITICAL").length}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Tampered</span><span className="text-red-400 font-mono">{history.filter((h) => h.tampered).length}</span></div>
                    </div>
                  </Panel>
                </div>
                <Panel title="System Information" icon={Cpu} accent="blue">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/30">
                      <div className="text-slate-500 text-xs mb-1">Frontend</div>
                      <div className="text-white">React 18 + Vite + Tailwind</div>
                      <div className="text-slate-400 text-xs mt-1">Dashboard UI Framework</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/30">
                      <div className="text-slate-500 text-xs mb-1">Backend</div>
                      <div className="text-white">Node.js + Express + MongoDB</div>
                      <div className="text-slate-400 text-xs mt-1">API Server + Database</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/30">
                      <div className="text-slate-500 text-xs mb-1">Hardware</div>
                      <div className="text-white">ESP32 + MPU6050 + DHT22 + GPS + RFID</div>
                      <div className="text-slate-400 text-xs mt-1">Sensor Array</div>
                    </div>
                  </div>
                </Panel>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

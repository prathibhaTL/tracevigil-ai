import { useState } from "react";
import { API_BASE } from "./api";

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  marginBottom: 16,
  borderRadius: 14,
  border: "1px solid #334155",
  background: "#020617",
  color: "#e2e8f0",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s"
};

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin"
  });
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email: form.email, password: form.password }
        : form;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed");
        return;
      }

      if (mode === "register") {
        setMessage("Registered successfully. Please log in.");
        setMode("login");
        return;
      }

      onLogin(data);
    } catch {
      setMessage("Network error. Is the backend running?");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at right, rgba(249,115,22,0.18), transparent 24%), linear-gradient(180deg, #020617, #08111f)"
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "min(420px, 92vw)",
          background: "rgba(15,23,42,0.96)",
          border: "1px solid #334155",
          borderRadius: 24,
          padding: "32px 28px",
          color: "#e2e8f0",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🚛</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>TraceAbility</h1>
        </div>

        <p style={{ color: "#94a3b8", textAlign: "center", marginBottom: 24, fontSize: 14 }}>
          {mode === "login"
            ? "Sign in to open your dashboard"
            : "Create a new admin or driver account"}
        </p>

        {mode === "register" && (
          <input
            placeholder="Full Name"
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        )}

        <input
          placeholder="Email address"
          type="email"
          style={inputStyle}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <input
          placeholder="Password"
          type="password"
          style={inputStyle}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {mode === "register" && (
          <select
            style={inputStyle}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="admin">Admin</option>
            <option value="driver">Driver</option>
          </select>
        )}

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 10,
              background: message.includes("success") ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: message.includes("success") ? "#86efac" : "#fda4af",
              fontSize: 13,
              textAlign: "center"
            }}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(90deg, #0ea5e9, #f97316)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 14,
            boxShadow: "0 4px 16px rgba(14,165,233,0.25)"
          }}
        >
          {mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
          }}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "1px solid #334155",
            background: "transparent",
            color: "#94a3b8",
            fontSize: 14,
            cursor: "pointer"
          }}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

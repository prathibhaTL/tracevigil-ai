// Change this to your laptop's IP address (for example, "http://192.168.1.5:5000")
// when opening the frontend on another device on the same network.
export const API_BASE = "http://localhost:5000";

export function getSession() {
  const raw = localStorage.getItem("traceability-session");
  return raw ? JSON.parse(raw) : null;
}

export function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}
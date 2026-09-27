import { useState } from "react";
import LoginPage from "./loginpage";
import AdminDashboard from "./AdminDashboard";
import DriverDashboard from "./DriverDashboard";

export default function App() {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem("traceability-session");
    return raw ? JSON.parse(raw) : null;
  });

  const onLogin = (data) => {
    localStorage.setItem("traceability-session", JSON.stringify(data));
    setSession(data);
  };

  const logout = () => {
    localStorage.removeItem("traceability-session");
    setSession(null);
  };

  if (!session) return <LoginPage onLogin={onLogin} />;

  return session.user.role === "admin" ? (
    <AdminDashboard onLogout={logout} />
  ) : (
    <DriverDashboard onLogout={logout} />
  );
}
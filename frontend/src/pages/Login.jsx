import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

export default function Login({ role, setPage, setLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const isStudent = role === "student";

  const login = async () => {
    try {
      setLoading(true);
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      const res = await axios.post(`${API_BASE_URL}/login`, {
        email: normalizedEmail,
        password: normalizedPassword,
        role,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("userEmail", res.data.email || "");
      localStorage.setItem("userName", res.data.name || "");

      setLoggedIn(true);
      setPage(res.data.role === "student" ? "dashboard" : "company");
    } catch (err) {
      const message = err?.response?.data || "Invalid email or password";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell flex items-center justify-center">
      <div className="glass w-full max-w-md p-7 md:p-8">
        <h1 className="heading-font text-3xl font-bold text-center mb-2">
          {isStudent ? "Student Login" : "Company Login"}
        </h1>
        <p className="muted text-center mb-6">Access your dashboard and continue your workflow.</p>

        <div className="space-y-3">
          <input
            placeholder="Email"
            className="input-modern"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="input-modern"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button onClick={login} disabled={loading} className="btn btn-primary w-full mt-5">
          {loading ? "Logging in..." : "Login"}
        </button>
        <button
          onClick={() => setPage(isStudent ? "login-company" : "login-student")}
          className="btn btn-outline w-full mt-3"
        >
          {isStudent ? "Login as Company" : "Login as Student"}
        </button>
        <button
          onClick={() => setPage(isStudent ? "signup-student" : "signup-company")}
          className="btn btn-outline w-full mt-3"
        >
          {isStudent ? "New student? Sign up" : "New company? Sign up"}
        </button>
        <button onClick={() => setPage("home")} className="w-full mt-3 text-sm muted">
          Back to Home
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import axios from "axios";
import Dashboard from "./pages/Dashboard";
import Company from "./pages/Company";
import { API_BASE_URL } from "./config/api";

function PortalAuth({ role, setPage, setLoggedIn }) {
  const [mode, setMode] = useState("login");
  const isStudent = role === "student";
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [studentSignup, setStudentSignup] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
  });
  const [companySignup, setCompanySignup] = useState({
    username: "",
    password: "",
    contactName: "",
    contactEmail: "",
    companyName: "",
    companyDescription: "",
  });

  const doLogin = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/login`, {
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password.trim(),
        role,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("userEmail", res.data.email || "");
      localStorage.setItem("userName", res.data.name || "");

      setLoggedIn(true);
      setPage(res.data.role === "student" ? "dashboard" : "company");
    } catch (err) {
      alert(err?.response?.data || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const doSignup = async () => {
    try {
      setLoading(true);

      if (isStudent) {
        const payload = {
          username: studentSignup.username.trim(),
          password: studentSignup.password.trim(),
          fullName: studentSignup.fullName.trim(),
          email: studentSignup.email.trim().toLowerCase(),
        };
        if (!payload.username || !payload.password || !payload.fullName || !payload.email) {
          alert("Please fill all required fields");
          return;
        }

        await axios.post(`${API_BASE_URL}/register/student`, payload);
        const loginRes = await axios.post(`${API_BASE_URL}/login`, {
          email: payload.email,
          password: payload.password,
          role: "student",
        });

        localStorage.setItem("token", loginRes.data.token);
        localStorage.setItem("role", loginRes.data.role);
        localStorage.setItem("userEmail", loginRes.data.email || payload.email);
        localStorage.setItem("userName", loginRes.data.name || payload.fullName);
        localStorage.setItem("studentProfile", JSON.stringify({}));
        setLoggedIn(true);
        setPage("dashboard");
        return;
      }

      const payload = {
        username: companySignup.username.trim(),
        password: companySignup.password.trim(),
        contactName: companySignup.contactName.trim(),
        contactEmail: companySignup.contactEmail.trim().toLowerCase(),
        companyName: companySignup.companyName.trim(),
        companyDescription: companySignup.companyDescription.trim(),
      };
      if (!payload.username || !payload.password || !payload.contactName || !payload.contactEmail || !payload.companyName) {
        alert("Please fill all required fields");
        return;
      }

      await axios.post(`${API_BASE_URL}/register/company`, payload);
      const loginRes = await axios.post(`${API_BASE_URL}/login`, {
        email: payload.contactEmail,
        password: payload.password,
        role: "company",
      });

      localStorage.setItem("token", loginRes.data.token);
      localStorage.setItem("role", loginRes.data.role);
      localStorage.setItem("userEmail", loginRes.data.email || payload.contactEmail);
      localStorage.setItem("userName", loginRes.data.name || payload.companyName);
      setLoggedIn(true);
      setPage("company");
    } catch (err) {
      alert(err?.response?.data || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell flex items-center justify-center">
      <div className="glass w-full max-w-2xl p-7 md:p-8">
        <h1 className="heading-font text-3xl font-bold text-center">
          {isStudent ? "Student Portal" : "Company Portal"}
        </h1>
        <p className="muted text-center mt-2 mb-6">Choose how you want to continue.</p>

        <div className="bg-white/10 border border-white/20 rounded-2xl p-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("login")}
            className={`btn w-full ${mode === "login" ? "bg-white text-slate-800" : "btn-outline"}`}
          >
            Log In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`btn w-full ${mode === "signup" ? "bg-white text-slate-800" : "btn-outline"}`}
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <div className="mt-5 space-y-3">
            <input
              placeholder="Email"
              className="input-modern"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              className="input-modern"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
            <button onClick={doLogin} disabled={loading} className="btn btn-primary w-full">
              {loading ? "Logging in..." : "Log In"}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {isStudent ? (
              <>
                <input
                  placeholder="Username"
                  className="input-modern"
                  value={studentSignup.username}
                  onChange={(e) => setStudentSignup({ ...studentSignup, username: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="input-modern"
                  value={studentSignup.password}
                  onChange={(e) => setStudentSignup({ ...studentSignup, password: e.target.value })}
                />
                <input
                  placeholder="Full Name"
                  className="input-modern"
                  value={studentSignup.fullName}
                  onChange={(e) => setStudentSignup({ ...studentSignup, fullName: e.target.value })}
                />
                <input
                  placeholder="Email"
                  className="input-modern"
                  value={studentSignup.email}
                  onChange={(e) => setStudentSignup({ ...studentSignup, email: e.target.value })}
                />
              </>
            ) : (
              <>
                <input
                  placeholder="Username"
                  className="input-modern"
                  value={companySignup.username}
                  onChange={(e) => setCompanySignup({ ...companySignup, username: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="input-modern"
                  value={companySignup.password}
                  onChange={(e) => setCompanySignup({ ...companySignup, password: e.target.value })}
                />
                <input
                  placeholder="Contact Name"
                  className="input-modern"
                  value={companySignup.contactName}
                  onChange={(e) => setCompanySignup({ ...companySignup, contactName: e.target.value })}
                />
                <input
                  placeholder="Contact Email"
                  className="input-modern"
                  value={companySignup.contactEmail}
                  onChange={(e) => setCompanySignup({ ...companySignup, contactEmail: e.target.value })}
                />
                <input
                  placeholder="Company Name"
                  className="input-modern"
                  value={companySignup.companyName}
                  onChange={(e) => setCompanySignup({ ...companySignup, companyName: e.target.value })}
                />
                <textarea
                  placeholder="Company Description"
                  className="input-modern min-h-24"
                  value={companySignup.companyDescription}
                  onChange={(e) => setCompanySignup({ ...companySignup, companyDescription: e.target.value })}
                />
              </>
            )}
            <button onClick={doSignup} disabled={loading} className="btn btn-secondary w-full">
              {loading ? "Creating account..." : "Register"}
            </button>
          </div>
        )}

        <button onClick={() => setPage("home")} className="w-full mt-4 text-sm muted">
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token) {
      setLoggedIn(true);
      if (role === "student") setPage("dashboard");
      if (role === "company") setPage("company");
    }
  }, []);

  const logout = () => {
    localStorage.clear();
    setLoggedIn(false);
    setPage("home");
  };

  if (page === "auth-student") return <PortalAuth role="student" setPage={setPage} setLoggedIn={setLoggedIn} />;
  if (page === "auth-company") return <PortalAuth role="company" setPage={setPage} setLoggedIn={setLoggedIn} />;
  if (page === "dashboard") return <Dashboard onLogout={logout} />;
  if (page === "company") return <Company onLogout={logout} />;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-6xl mx-auto px-5 py-4 md:py-6">
        <nav className="bg-white border border-slate-200 rounded-xl px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-sm">
          <h1 className="heading-font text-2xl font-bold text-slate-900">
            Intern<span className="text-indigo-600">Match</span>
          </h1>
          <div className="flex items-center gap-3">
            {!loggedIn ? (
              <>
                <button onClick={() => setPage("auth-student")} className="text-slate-700 font-medium px-3 py-2">
                  Sign In
                </button>
                <button
                  onClick={() => setPage("auth-student")}
                  className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 transition"
                >
                  Get Started
                </button>
              </>
            ) : (
              <button onClick={logout} className="rounded-lg bg-rose-500 text-white px-4 py-2 font-semibold hover:bg-rose-600 transition">
                Logout
              </button>
            )}
          </div>
        </nav>

        <section className="text-center mt-16 md:mt-20">
          <h2 className="heading-font text-5xl md:text-7xl font-extrabold leading-tight text-slate-900">
            Find the perfect{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
              internship
            </span>
            <br />
            without the noise.
          </h2>
          <p className="mt-6 max-w-3xl mx-auto text-slate-600 text-lg">
            Our matching engine connects students and companies using skills, domain, location, stipend, and experience level.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setPage("auth-student")}
              className="rounded-full bg-indigo-600 text-white px-8 py-3 font-semibold shadow-md hover:bg-indigo-700 transition"
            >
              I&apos;m a Student
            </button>
            <button
              onClick={() => setPage("auth-company")}
              className="rounded-full border border-slate-300 bg-white px-8 py-3 font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              I&apos;m a Company
            </button>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mt-20 pb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="heading-font text-2xl font-bold text-slate-900">Weighted Scoring</h3>
            <p className="text-slate-600 mt-3">
              Matching based on skills, domain, location, stipend, and experience.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="heading-font text-2xl font-bold text-slate-900">For Students</h3>
            <p className="text-slate-600 mt-3">
              Discover relevant internships faster and apply directly.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="heading-font text-2xl font-bold text-slate-900">For Companies</h3>
            <p className="text-slate-600 mt-3">
              Receive structured applications and approve the best candidates.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

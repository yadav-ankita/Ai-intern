import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Company from "./pages/Company";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

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

  if (page === "login") return <Login role="student" setPage={setPage} setLoggedIn={setLoggedIn} />;
  if (page === "login-student") return <Login role="student" setPage={setPage} setLoggedIn={setLoggedIn} />;
  if (page === "login-company") return <Login role="company" setPage={setPage} setLoggedIn={setLoggedIn} />;
  if (page === "signup-student") return <Signup role="student" setPage={setPage} setLoggedIn={setLoggedIn} />;
  if (page === "signup-company") return <Signup role="company" setPage={setPage} setLoggedIn={setLoggedIn} />;
  if (page === "dashboard") return <Dashboard onLogout={logout} />;
  if (page === "company") return <Company onLogout={logout} />;
  if (page === "register") {
    return (
      <div className="shell flex items-center justify-center">
        <div className="glass w-full max-w-xl p-7 md:p-8">
          <h1 className="heading-font text-3xl font-bold text-center">Register</h1>
          <p className="muted text-center mt-2 mb-6">Choose your portal to create an account.</p>

          <div className="space-y-3">
            <button onClick={() => setPage("signup-student")} className="btn btn-secondary w-full">
              Student Portal Register
            </button>
            <button onClick={() => setPage("signup-company")} className="btn btn-outline w-full">
              Company Portal Register
            </button>
          </div>

          <p className="text-center mt-5 text-sm muted">
            Have an account?{" "}
            <button onClick={() => setPage("login")} className="underline font-semibold">
              Login
            </button>
          </p>
          <button onClick={() => setPage("home")} className="w-full mt-3 text-sm muted">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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
                <button onClick={() => setPage("login")} className="text-slate-700 font-medium px-3 py-2">
                  Login
                </button>
                <button
                  onClick={() => setPage("register")}
                  className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 transition"
                >
                  Register
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
              onClick={() => setPage("register")}
              className="rounded-full bg-indigo-600 text-white px-8 py-3 font-semibold shadow-md hover:bg-indigo-700 transition"
            >
              Register
            </button>
            <button
              onClick={() => setPage("login")}
              className="rounded-full border border-slate-300 bg-white px-8 py-3 font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              Login
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

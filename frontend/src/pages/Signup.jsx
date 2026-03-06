import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

export default function Signup({ role, setPage, setLoggedIn }) {
  const [studentForm, setStudentForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    location: "",
    skills: "",
    domain: "",
  });
  const [companyForm, setCompanyForm] = useState({
    username: "",
    password: "",
    contactName: "",
    contactEmail: "",
    companyName: "",
    companyDescription: "",
  });
  const [loading, setLoading] = useState(false);
  const isStudent = role === "student";

  const signup = async () => {
    try {
      setLoading(true);

      const endpoint = isStudent ? "/register/student" : "/register/company";
      const payload = isStudent
        ? {
            username: studentForm.username.trim(),
            password: studentForm.password.trim(),
            fullName: studentForm.fullName.trim(),
            email: studentForm.email.trim().toLowerCase(),
            location: studentForm.location.trim(),
            skills: studentForm.skills.trim(),
            domain: studentForm.domain.trim(),
          }
        : {
            username: companyForm.username.trim(),
            password: companyForm.password.trim(),
            contactName: companyForm.contactName.trim(),
            contactEmail: companyForm.contactEmail.trim().toLowerCase(),
            companyName: companyForm.companyName.trim(),
            companyDescription: companyForm.companyDescription.trim(),
          };

      const requiredFields = isStudent
        ? [payload.username, payload.password, payload.fullName, payload.email, payload.location, payload.skills, payload.domain]
        : [payload.username, payload.password, payload.contactName, payload.contactEmail, payload.companyName];

      if (requiredFields.some((value) => !value)) {
        alert("Please fill all required fields");
        return;
      }

      await axios.post(`${API_BASE_URL}${endpoint}`, payload);

      if (isStudent) {
        const loginRes = await axios.post(`${API_BASE_URL}/login`, {
          email: payload.email,
          password: payload.password,
          role: "student",
        });

        localStorage.setItem("token", loginRes.data.token);
        localStorage.setItem("role", loginRes.data.role);
        localStorage.setItem("userEmail", loginRes.data.email || payload.email);
        localStorage.setItem("userName", loginRes.data.name || payload.fullName);
        localStorage.setItem(
          "studentProfile",
          JSON.stringify({
            preferredDomain: payload.domain,
            preferredLocation: payload.location,
            skills: payload.skills,
          })
        );

        setLoggedIn(true);
        alert("Account created and logged in successfully");
        setPage("dashboard");
        return;
      }

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
      alert("Company account created and logged in successfully");
      setPage("company");
    } catch (err) {
      const message = err?.response?.data || "Signup failed";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell">
      <div className="max-w-4xl mx-auto glass p-7 md:p-9">
        <h1 className="heading-font text-3xl font-bold text-center">
          {isStudent ? "Student Signup" : "Company Signup"}
        </h1>
        <p className="muted text-center mt-2 mb-6">
          {isStudent
            ? "Create your profile and start applying quickly."
            : "Create a company account and start hiring faster."}
        </p>

        {isStudent ? (
          <>
            <div className="space-y-4">
              <input
                placeholder="Username"
                className="input-modern"
                value={studentForm.username}
                onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                className="input-modern"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
              />
              <input
                placeholder="Full Name"
                className="input-modern"
                value={studentForm.fullName}
                onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
              />
              <input
                placeholder="Email"
                className="input-modern"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              />
              <input
                placeholder="Location"
                className="input-modern"
                value={studentForm.location}
                onChange={(e) => setStudentForm({ ...studentForm, location: e.target.value })}
              />
              <input
                placeholder="Skills (comma separated)"
                className="input-modern"
                value={studentForm.skills}
                onChange={(e) => setStudentForm({ ...studentForm, skills: e.target.value })}
              />
              <input
                placeholder="Domain"
                className="input-modern"
                value={studentForm.domain}
                onChange={(e) => setStudentForm({ ...studentForm, domain: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                placeholder="Username"
                className="input-modern"
                value={companyForm.username}
                onChange={(e) => setCompanyForm({ ...companyForm, username: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                className="input-modern"
                value={companyForm.password}
                onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })}
              />
              <input
                placeholder="Contact Name"
                className="input-modern"
                value={companyForm.contactName}
                onChange={(e) => setCompanyForm({ ...companyForm, contactName: e.target.value })}
              />
              <input
                placeholder="Contact Email"
                className="input-modern"
                value={companyForm.contactEmail}
                onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
              />
            </div>
            <input
              placeholder="Company Name"
              className="input-modern mt-4"
              value={companyForm.companyName}
              onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
            />
            <textarea
              placeholder="Company Description"
              className="input-modern mt-4 min-h-28"
              value={companyForm.companyDescription}
              onChange={(e) => setCompanyForm({ ...companyForm, companyDescription: e.target.value })}
            />
          </>
        )}

        <button onClick={signup} disabled={loading} className="btn btn-secondary w-full mt-6">
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <p className="text-center mt-4 text-sm muted">
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

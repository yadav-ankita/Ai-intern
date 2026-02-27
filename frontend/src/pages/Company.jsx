import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

export default function Company({ onLogout }) {
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [stipend, setStipend] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [domain, setDomain] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Beginner");
  const [list, setList] = useState([]);
  const [applications, setApplications] = useState([]);

  const companyEmail = (localStorage.getItem("userEmail") || "").toLowerCase();
  const companyName = localStorage.getItem("userName") || "";

  const fetchInternships = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/company/internships`, {
        params: { email: companyEmail },
      });
      setList(res.data || []);
    } catch (err) {
      console.log("Error fetching internships");
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/company/applications`, {
        params: { email: companyEmail },
      });
      setApplications(res.data || []);
    } catch (err) {
      console.log("Error fetching applications");
    }
  };

  useEffect(() => {
    fetchInternships();
    fetchApplications();
  }, []);

  const postInternship = async () => {
    try {
      await axios.post(`${API_BASE_URL}/post-internship`, {
        title,
        skills,
        location,
        stipend,
        durationMonths,
        domain,
        experienceLevel,
        companyEmail,
        companyName,
      });
      alert("Internship posted");
      setTitle("");
      setSkills("");
      setLocation("");
      setStipend("");
      setDurationMonths("");
      setDomain("");
      setExperienceLevel("Beginner");
      fetchInternships();
    } catch (err) {
      alert("Error posting internship");
    }
  };

  const decideApplication = async (applicationId, status) => {
    try {
      await axios.post(`${API_BASE_URL}/company/applications/${applicationId}/decision`, {
        status,
        companyEmail,
      });
      fetchApplications();
    } catch (err) {
      alert(err?.response?.data || "Failed to update status");
    }
  };

  return (
    <div className="shell">
      <div className="max-w-7xl mx-auto">
        <div className="glass p-5 md:p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="heading-font text-3xl font-bold">Company Dashboard</h1>
            <p className="muted text-sm mt-1">Post internships and approve candidates.</p>
          </div>
          <button onClick={onLogout} className="btn btn-danger">Logout</button>
        </div>

        <div className="grid xl:grid-cols-3 gap-6 mt-6">
          <div className="glass p-6 xl:col-span-1">
            <h2 className="heading-font text-xl font-semibold mb-4">Post New Internship</h2>
            <div className="space-y-3">
              <input className="input-modern" placeholder="Internship title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="input-modern" placeholder="Skills (python react node)" value={skills} onChange={(e) => setSkills(e.target.value)} />
              <input className="input-modern" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
              <input className="input-modern" placeholder="Stipend" value={stipend} onChange={(e) => setStipend(e.target.value)} />
              <input className="input-modern" placeholder="Duration (Months)" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} />
              <input className="input-modern" placeholder="Domain (Frontend, AI, Data...)" value={domain} onChange={(e) => setDomain(e.target.value)} />
              <select className="input-modern" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <button onClick={postInternship} className="btn btn-secondary mt-4 w-full">Post Internship</button>
          </div>

          <div className="glass p-6 xl:col-span-2">
            <h2 className="heading-font text-xl font-semibold mb-4">Applications For Approval</h2>
            {applications.length === 0 ? (
              <p className="muted">No applications yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {applications.map((app) => (
                  <div key={app.id} className="rounded-xl border border-white/20 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold text-cyan-200">{app.title}</h3>
                    <p className="text-sm mt-2">Student: {app.student_name || app.student_email}</p>
                    <p className="text-sm">Email: {app.student_email}</p>
                    <p className="text-sm">Domain: {app.preferred_domain || "-"}</p>
                    <p className="text-sm">Location: {app.preferred_location || "-"}</p>
                    <p className="text-sm">Skills: {app.skills || "-"}</p>
                    <p className="text-sm">Stipend: {app.expected_stipend || "-"}</p>
                    <p className="text-sm">Duration: {app.duration_months || "-"}</p>
                    <p className="text-sm">Experience: {app.experience_level || "-"}</p>
                    {app.resume_filename ? (
                      <a
                        href={`${API_BASE_URL}/company/applications/${app.id}/resume?email=${encodeURIComponent(companyEmail)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-2 text-sm text-cyan-300 underline"
                      >
                        Download Resume (PDF)
                      </a>
                    ) : (
                      <p className="text-sm mt-2">Resume: -</p>
                    )}
                    <p className="text-sm mt-2">Status: <span className="uppercase font-semibold">{app.status}</span></p>

                    {app.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => decideApplication(app.id, "approved")} className="btn btn-secondary">Approve</button>
                        <button onClick={() => decideApplication(app.id, "rejected")} className="btn btn-danger">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass p-6 mt-7">
          <h2 className="heading-font text-xl font-semibold mb-4">Your Posted Internships</h2>
          {list.length === 0 ? (
            <p className="muted">No internships posted yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {list.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/20 bg-white/5 p-4">
                  <h3 className="text-lg font-semibold text-cyan-200">{item.title}</h3>
                  <p className="muted text-sm mt-1">{item.location}</p>
                  <p className="mt-2 font-semibold">INR {item.stipend}</p>
                  <p className="text-sm mt-1">Duration: {item.duration_months || "-"}</p>
                  <p className="text-sm mt-2">{item.skills}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

export default function Dashboard({ onLogout }) {
  const userEmail = localStorage.getItem("userEmail") || "";
  const userName = localStorage.getItem("userName") || "";

  const [studentProfile, setStudentProfile] = useState({
    preferredDomain: "",
    preferredLocation: "",
    skills: "",
    expectedStipend: "",
    durationMonths: "",
    experienceLevel: "Beginner",
  });
  const [results, setResults] = useState([]);
  const [applications, setApplications] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [activeTab, setActiveTab] = useState("recommended");
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [accountProfile, setAccountProfile] = useState({
    fullName: userName,
    email: userEmail,
    location: "",
    skills: "",
    domain: "",
  });
  const [profileForm, setProfileForm] = useState({
    fullName: userName,
    location: "",
    skills: "",
    domain: "",
  });

  useEffect(() => {
    const raw = localStorage.getItem("studentProfile");
    if (!raw) return;
    try {
      const profile = JSON.parse(raw);
      setStudentProfile({
        preferredDomain: profile.preferredDomain || "",
        preferredLocation: profile.preferredLocation || "",
        skills: profile.skills || "",
        expectedStipend: profile.expectedStipend || "",
        durationMonths: profile.durationMonths || "",
        experienceLevel: profile.experienceLevel || "Beginner",
      });
    } catch (err) {
      console.log("No saved student profile");
    }
  }, []);

  const loadMyApplications = async () => {
    if (!userEmail) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/student/applications`, {
        params: { email: userEmail },
      });
      setApplications(res.data || []);
    } catch (err) {
      console.log("Failed to load applications");
    }
  };

  const loadStudentAccountProfile = async () => {
    if (!userEmail) return;
    try {
      setProfileLoading(true);
      const res = await axios.get(`${API_BASE_URL}/student/profile`, {
        params: { email: userEmail },
      });
      const profile = res.data || {};

      const nextAccount = {
        fullName: profile.name || userName || "",
        email: profile.email || userEmail,
        location: profile.location || "",
        skills: profile.skills || "",
        domain: profile.domain || "",
      };

      setAccountProfile(nextAccount);
      setProfileForm({
        fullName: nextAccount.fullName,
        location: nextAccount.location,
        skills: nextAccount.skills,
        domain: nextAccount.domain,
      });

      localStorage.setItem("userName", nextAccount.fullName);

      setStudentProfile((prev) => ({
        ...prev,
        preferredDomain: nextAccount.domain || prev.preferredDomain,
        preferredLocation: nextAccount.location || prev.preferredLocation,
        skills: nextAccount.skills || prev.skills,
      }));

      const raw = localStorage.getItem("studentProfile");
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        "studentProfile",
        JSON.stringify({
          ...existing,
          preferredDomain: nextAccount.domain || existing.preferredDomain || "",
          preferredLocation: nextAccount.location || existing.preferredLocation || "",
          skills: nextAccount.skills || existing.skills || "",
        })
      );
    } catch (err) {
      console.log("Failed to load student profile");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadMyApplications();
    loadStudentAccountProfile();
  }, [userEmail]);

  const updateProfileField = (key, value) => {
    setStudentProfile((prev) => ({ ...prev, [key]: value }));
  };

  const onResumeChange = (e) => {
    const selected = e.target.files?.[0] || null;
    if (!selected) {
      setResumeFile(null);
      setExtractedSkills([]);
      setHasExtracted(false);
      return;
    }
    const isPdfMime = selected.type === "application/pdf";
    const isPdfName = selected.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime && !isPdfName) {
      alert("Only PDF resume is allowed");
      e.target.value = "";
      setResumeFile(null);
      setExtractedSkills([]);
      setHasExtracted(false);
      return;
    }
    setResumeFile(selected);
    setExtractedSkills([]);
    setHasExtracted(false);
  };

  const runManualMatching = async () => {
    try {
      setLoading(true);
      localStorage.setItem("studentProfile", JSON.stringify(studentProfile));
      let res;
      if (resumeFile) {
        const formData = new FormData();
        formData.append("resume", resumeFile);
        formData.append("preferredDomain", studentProfile.preferredDomain);
        formData.append("preferredLocation", studentProfile.preferredLocation);
        formData.append("skills", studentProfile.skills);
        formData.append("expectedStipend", studentProfile.expectedStipend);
        formData.append("durationMonths", studentProfile.durationMonths);
        formData.append("experienceLevel", studentProfile.experienceLevel);
        res = await axios.post(`${API_BASE_URL}/recommend-resume`, formData);
      } else {
        res = await axios.post(`${API_BASE_URL}/recommend`, studentProfile);
      }
      setResults(res.data || []);
      setActiveTab("recommended");
    } catch (err) {
      alert(err?.response?.data || "Matching failed");
    } finally {
      setLoading(false);
    }
  };

  const extractFromResume = async () => {
    if (!resumeFile) {
      alert("Please upload your resume first");
      return;
    }

    try {
      setExtracting(true);
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const res = await axios.post(`${API_BASE_URL}/extract-resume-profile`, formData);
      const extracted = res.data || {};
      const listFromArray = Array.isArray(extracted.extracted_skills) ? extracted.extracted_skills : [];
      const listFromString = String(extracted.skills || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      setExtractedSkills(listFromArray.length > 0 ? listFromArray : listFromString);
      setHasExtracted(true);

      setStudentProfile((prev) => ({
        ...prev,
        preferredDomain: extracted.preferredDomain || prev.preferredDomain,
        preferredLocation: extracted.preferredLocation || prev.preferredLocation,
        skills: extracted.skills || prev.skills,
        expectedStipend: extracted.expectedStipend || prev.expectedStipend,
        durationMonths: extracted.durationMonths || prev.durationMonths,
        experienceLevel: extracted.experienceLevel || prev.experienceLevel,
      }));
    } catch (err) {
      setHasExtracted(false);
      alert(err?.response?.data || "Failed to extract fields from resume");
    } finally {
      setExtracting(false);
    }
  };

  const applyToInternship = async (internshipId) => {
    if (!userEmail) {
      alert("Please login again");
      return;
    }
    if (!resumeFile) {
      alert("Please upload your resume before applying");
      return;
    }
    try {
      setApplyingId(internshipId);
      const formData = new FormData();
      formData.append("internshipId", internshipId);
      formData.append("studentEmail", userEmail);
      formData.append("studentName", userName);
      formData.append("preferredDomain", studentProfile.preferredDomain);
      formData.append("preferredLocation", studentProfile.preferredLocation);
      formData.append("skills", studentProfile.skills);
      formData.append("expectedStipend", studentProfile.expectedStipend);
      formData.append("durationMonths", studentProfile.durationMonths);
      formData.append("experienceLevel", studentProfile.experienceLevel);
      formData.append("resume", resumeFile);
      await axios.post(`${API_BASE_URL}/apply-internship`, formData);
      alert("Application submitted to company for approval");
      await loadMyApplications();
    } catch (err) {
      alert(err?.response?.data || "Failed to apply");
    } finally {
      setApplyingId(null);
    }
  };

  const cancelApplication = async (applicationId) => {
    if (!userEmail) {
      alert("Please login again");
      return;
    }

    const confirmed = window.confirm("Cancel this application?");
    if (!confirmed) return;

    try {
      await axios.post(`${API_BASE_URL}/student/applications/${applicationId}/cancel`, {
        studentEmail: userEmail,
      });
      await loadMyApplications();
      alert("Application cancelled");
    } catch (err) {
      alert(err?.response?.data || "Failed to cancel application");
    }
  };

  const findApplicationByInternship = (internshipId) =>
    applications.find((a) => Number(a.internship_id) === Number(internshipId));

  const saveProfileChanges = async () => {
    if (!userEmail) {
      alert("Please login again");
      return;
    }

    const payload = { email: userEmail };
    const nextFullName = profileForm.fullName.trim();
    const nextLocation = profileForm.location.trim();
    const nextSkills = profileForm.skills.trim();
    const nextDomain = profileForm.domain.trim();

    if (nextFullName !== String(accountProfile.fullName || "").trim()) payload.fullName = nextFullName;
    if (nextLocation !== String(accountProfile.location || "").trim()) payload.location = nextLocation;
    if (nextSkills !== String(accountProfile.skills || "").trim()) payload.skills = nextSkills;
    if (nextDomain !== String(accountProfile.domain || "").trim()) payload.domain = nextDomain;

    if (Object.keys(payload).length === 1) {
      alert("No profile changes detected");
      return;
    }

    try {
      setSavingProfile(true);
      const res = await axios.patch(`${API_BASE_URL}/student/profile`, payload);
      const updated = res.data || {};

      const nextAccount = {
        fullName: updated.name || profileForm.fullName.trim(),
        email: updated.email || userEmail,
        location: updated.location || "",
        skills: updated.skills || "",
        domain: updated.domain || "",
      };

      setAccountProfile(nextAccount);
      setProfileForm({
        fullName: nextAccount.fullName,
        location: nextAccount.location,
        skills: nextAccount.skills,
        domain: nextAccount.domain,
      });
      setEditingProfile(false);

      localStorage.setItem("userName", nextAccount.fullName);
      setStudentProfile((prev) => ({
        ...prev,
        preferredDomain: nextAccount.domain || prev.preferredDomain,
        preferredLocation: nextAccount.location || prev.preferredLocation,
        skills: nextAccount.skills || prev.skills,
      }));

      const raw = localStorage.getItem("studentProfile");
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        "studentProfile",
        JSON.stringify({
          ...existing,
          preferredDomain: nextAccount.domain || existing.preferredDomain || "",
          preferredLocation: nextAccount.location || existing.preferredLocation || "",
          skills: nextAccount.skills || existing.skills || "",
        })
      );

      alert("Profile updated successfully");
    } catch (err) {
      alert(err?.response?.data || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-[1400px] mx-auto px-4 py-5 md:px-6">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 md:px-6 md:py-4 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="heading-font text-2xl font-bold">Student Dashboard</h1>
            <p className="text-slate-500 text-sm">Find, apply, and track internship approvals.</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg bg-rose-500 text-white px-4 py-2 font-semibold hover:bg-rose-600 transition"
          >
            Logout
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mt-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="heading-font text-2xl font-bold text-slate-900">Student Profile</h2>
              <p className="text-slate-500 text-sm mt-1">View your profile and update only the fields you want to change.</p>
            </div>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 font-semibold hover:bg-slate-800 transition"
              >
                Update Profile
              </button>
            )}
          </div>

          {profileLoading ? (
            <p className="text-slate-500 mt-4">Loading profile...</p>
          ) : editingProfile ? (
            <div className="mt-4 space-y-3">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 w-full"
                placeholder="Full Name"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 w-full bg-slate-100"
                value={accountProfile.email}
                readOnly
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 w-full"
                placeholder="Location"
                value={profileForm.location}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, location: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 w-full"
                placeholder="Skills (comma separated)"
                value={profileForm.skills}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, skills: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 w-full"
                placeholder="Domain"
                value={profileForm.domain}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, domain: e.target.value }))}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveProfileChanges}
                  disabled={savingProfile}
                  className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 transition"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileForm({
                      fullName: accountProfile.fullName,
                      location: accountProfile.location,
                      skills: accountProfile.skills,
                      domain: accountProfile.domain,
                    });
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 mt-4 text-slate-700">
              <p><span className="font-semibold">Full Name:</span> {accountProfile.fullName || "-"}</p>
              <p><span className="font-semibold">Email:</span> {accountProfile.email || "-"}</p>
              <p><span className="font-semibold">Location:</span> {accountProfile.location || "-"}</p>
              <p><span className="font-semibold">Domain:</span> {accountProfile.domain || "-"}</p>
              <p className="md:col-span-2"><span className="font-semibold">Skills:</span> {accountProfile.skills || "-"}</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mt-5 shadow-sm">
          <p className="text-slate-600">Enter your details and run matching manually.</p>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Preferred Domain"
              value={studentProfile.preferredDomain}
              onChange={(e) => updateProfileField("preferredDomain", e.target.value)}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Preferred Location"
              value={studentProfile.preferredLocation}
              onChange={(e) => updateProfileField("preferredLocation", e.target.value)}
            />
          </div>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 w-full mt-3"
            placeholder="Skills (comma separated)"
            value={studentProfile.skills}
            onChange={(e) => updateProfileField("skills", e.target.value)}
          />
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Expected Stipend"
              value={studentProfile.expectedStipend}
              onChange={(e) => updateProfileField("expectedStipend", e.target.value)}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Duration (Months)"
              value={studentProfile.durationMonths}
              onChange={(e) => updateProfileField("durationMonths", e.target.value)}
            />
          </div>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 mt-3 w-full"
            value={studentProfile.experienceLevel}
            onChange={(e) => updateProfileField("experienceLevel", e.target.value)}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={onResumeChange}
            className="rounded-lg border border-slate-300 px-3 py-2 mt-3 w-full bg-white"
          />
          <button
            onClick={extractFromResume}
            disabled={extracting}
            className="rounded-lg bg-emerald-600 text-white px-5 py-2 font-semibold hover:bg-emerald-700 transition mt-3"
          >
            {extracting ? "Extracting..." : "Extract"}
          </button>
          {hasExtracted && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-emerald-800 font-semibold text-sm">Extracted Skills</p>
              <p className="text-emerald-700 text-sm mt-1">
                {extractedSkills.length > 0 ? extractedSkills.join(", ") : "No known skills were detected from this resume."}
              </p>
            </div>
          )}
          <button
            onClick={runManualMatching}
            disabled={loading}
            className="rounded-lg bg-indigo-600 text-white px-5 py-2 font-semibold hover:bg-indigo-700 transition mt-3"
          >
            {loading ? "Processing..." : "Run Matching"}
          </button>
        </div>

        <div className="mt-5 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("recommended")}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === "recommended" ? "bg-slate-900 text-white" : "text-slate-600"
            }`}
          >
            Recommended for You
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === "applications" ? "bg-slate-900 text-white" : "text-slate-600"
            }`}
          >
            My Applications
          </button>
        </div>

        {activeTab === "recommended" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
            {results.map((item) => {
              const app = findApplicationByInternship(item.id);
              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="heading-font text-3xl font-bold text-slate-900">{item.title}</h3>
                      <p className="text-slate-500 mt-1">{item.posted_by_name || "Company"}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-center min-w-[110px]">
                      <p className="text-rose-500 text-xs font-bold">MATCH</p>
                      <p className="text-rose-600 text-3xl font-bold leading-none">{item.match_percent}%</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-sm">{item.domain || studentProfile.preferredDomain || "General"}</span>
                    <span className="px-3 py-1 rounded-xl border border-slate-300 text-slate-700 text-sm">{item.experience_level || studentProfile.experienceLevel}</span>
                  </div>

                  <p className="text-slate-600 mt-4 line-clamp-2">
                    Skills required: {item.skills || "Not specified"}
                  </p>

                  <div className="bg-slate-100 rounded-xl p-4 mt-4 space-y-2 text-slate-700">
                    <p>Location: {item.location || "Remote"}</p>
                    <p>Stipend: INR {item.stipend || "-"}/mo</p>
                    <p>Duration: {item.duration_months || studentProfile.durationMonths || "Flexible"} Months</p>
                    <p>Seats: {item.seats_required || "-"}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-slate-500 text-sm">Posted recently</p>
                    {app ? (
                      <span className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold uppercase">
                        {app.status}
                      </span>
                    ) : (
                      <button
                        onClick={() => applyToInternship(item.id)}
                        disabled={applyingId === item.id}
                        className="rounded-xl bg-indigo-600 text-white px-6 py-2.5 font-semibold hover:bg-indigo-700 transition"
                      >
                        {applyingId === item.id ? "Applying..." : "Apply Now"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            {applications.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-slate-500">
                No applications yet.
              </div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="heading-font text-2xl font-bold text-slate-900">{app.title}</h3>
                  <p className="text-slate-500 mt-1">{app.location}</p>
                  <p className="mt-4">
                    Status:{" "}
                    <span className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 uppercase font-semibold">
                      {app.status}
                    </span>
                  </p>
                  {app.status === "pending" && (
                    <button
                      onClick={() => cancelApplication(app.id)}
                      className="rounded-lg bg-rose-500 text-white px-4 py-2 font-semibold hover:bg-rose-600 transition mt-4"
                    >
                      Cancel Application
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");

const { pool, ensureSchema } = require("./config/db");
const { buildRecommendationProfile, scoreInternships } = require("./utils/recommendation");

const SECRET = process.env.JWT_SECRET || "aiinternsecret";
const BASE_DIR = path.resolve(__dirname, "..");
const UPLOADS_DIR = path.join(BASE_DIR, "uploads");
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || "http://localhost:5001";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

const upload = multer({ dest: UPLOADS_DIR });

const isPdfUpload = (file) => {
  if (!file) return false;
  const mime = String(file.mimetype || "").toLowerCase();
  const name = String(file.originalname || file.filename || "").toLowerCase();
  const allowedMime = ["application/pdf", "application/x-pdf"];
  return allowedMime.includes(mime) || name.endsWith(".pdf");
};

const parseOpenDays = (value, fallback = null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const days = Number(raw);
  if (!Number.isInteger(days) || days <= 0) return null;
  return days;
};

const parseSeatsRequired = (value) => {
  const seats = Number(String(value ?? "").trim());
  if (!Number.isInteger(seats) || seats <= 0) return null;
  return seats;
};

const parseNonNegativeInt = (value) => {
  const num = Number(String(value ?? "").trim());
  if (!Number.isInteger(num) || num < 0) return null;
  return num;
};

ensureSchema();

app.get("/", (req, res) => {
  res.send("Backend running 🔥");
});

app.post("/register/student", async (req, res) => {
  try {
    const fullName = (req.body.fullName || req.body.name || req.body.username || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();

    if (!fullName || !email || !password) {
      return res.status(400).send("Full name, email and password are required");
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query("INSERT INTO students(name,email,password) VALUES($1,$2,$3)", [
      fullName,
      email,
      hashed,
    ]);

    res.send("Student registered");
  } catch (err) {
    console.log(err);
    res.status(500).send("Student registration failed");
  }
});

app.post("/register/company", async (req, res) => {
  try {
    const companyName = (req.body.companyName || req.body.name || req.body.username || "").trim();
    const email = (req.body.contactEmail || req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();

    if (!companyName || !email || !password) {
      return res.status(400).send("Company name, contact email and password are required");
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query("INSERT INTO companies(name,email,password) VALUES($1,$2,$3)", [
      companyName,
      email,
      hashed,
    ]);

    res.send("Company registered");
  } catch (err) {
    console.log(err);
    res.status(500).send("Company registration failed");
  }
});

const getTopRecommendations = async (profileInput, limit = 5) => {
  const result = await pool.query(
    `SELECT * FROM internships
     WHERE (application_expires_at IS NULL OR application_expires_at > NOW())
       AND (seats_required IS NULL OR seats_required > 0)`
  );
  const scored = scoreInternships(result.rows, buildRecommendationProfile(profileInput));
  return scored.slice(0, limit);
};

const getResumeRecommendations = async (resumeFilename, profileInput = {}, limit = 5) => {
  const result = await pool.query(
    `SELECT * FROM internships
     WHERE (application_expires_at IS NULL OR application_expires_at > NOW())
       AND (seats_required IS NULL OR seats_required > 0)`
  );
  const internships = result.rows || [];

  if (internships.length === 0) return [];

  const pythonResponse = await axios.post(`${PYTHON_AI_URL}/tfidf-match`, {
    file: path.join("uploads", resumeFilename),
    internships,
  });

  const ranked = (pythonResponse?.data?.matches || []).map((item) => ({
    ...item,
    tfidf_percent: item.match_percent || 0,
    extracted_skills: pythonResponse?.data?.extracted_skills || [],
  }));

  const profileBoosted = scoreInternships(ranked, buildRecommendationProfile(profileInput));

  return profileBoosted.slice(0, limit);
};

const extractResumeProfile = async (resumeFilename) => {
  const pythonResponse = await axios.post(`${PYTHON_AI_URL}/extract-profile`, {
    file: path.join("uploads", resumeFilename),
  });
  return pythonResponse?.data || {};
};

app.post("/recommend", async (req, res) => {
  try {
    const recommendations = await getTopRecommendations(req.body || {});
    res.json(recommendations);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error in recommendation");
  }
});

app.post("/recommend-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Resume is required");
    if (!isPdfUpload(req.file)) {
      if (req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(400).send("Only PDF resumes are allowed");
    }

    const profile = {
      preferredDomain: req.body.preferredDomain,
      preferredLocation: req.body.preferredLocation,
      skills: req.body.skills,
      expectedStipend: req.body.expectedStipend,
      durationMonths: req.body.durationMonths,
      experienceLevel: req.body.experienceLevel,
    };

    const recommendations = await getResumeRecommendations(req.file.filename, profile);
    res.json(recommendations);
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).send("Failed to run NLP matching");
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

app.post("/extract-resume-profile", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Resume is required");
    if (!isPdfUpload(req.file)) {
      if (req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(400).send("Only PDF resumes are allowed");
    }

    const extractedProfile = await extractResumeProfile(req.file.filename);
    res.json(extractedProfile);
  } catch (err) {
    console.error(err?.response?.data || err);
    if (err?.code === "ECONNREFUSED" || err?.code === "ECONNABORTED") {
      return res.status(503).send("Python AI service is not reachable. Start python_ai/app.py on port 5001.");
    }
    const serviceError = err?.response?.data?.error || err?.response?.data?.message;
    if (serviceError) {
      return res.status(500).send(`Resume extraction failed: ${serviceError}`);
    }
    res.status(500).send("Failed to extract profile from resume");
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

app.post("/post-internship", async (req, res) => {
  try {
    const {
      title,
      skills,
      location,
      stipend,
      durationMonths,
      seatsRequired,
      applicationOpenDays,
      companyEmail,
      companyName,
      domain,
      experienceLevel,
    } = req.body;

    if (!companyEmail || !String(companyEmail).trim()) {
      return res.status(400).send("Company email is required. Please login again.");
    }
    if (!title || !String(title).trim()) {
      return res.status(400).send("Title is required");
    }
    if (!skills || !String(skills).trim()) {
      return res.status(400).send("Skills are required");
    }
    if (!durationMonths || !String(durationMonths).trim()) {
      return res.status(400).send("Duration is required");
    }
    const seats = parseSeatsRequired(seatsRequired);
    if (!seats) {
      return res.status(400).send("Seats required must be a positive integer");
    }
    const openDays = parseOpenDays(applicationOpenDays, 30);
    if (!openDays) {
      return res.status(400).send("Application open duration (days) must be a positive integer");
    }

    await pool.query(
      `INSERT INTO internships
      (title,skills,location,stipend,duration_months,seats_required,application_open_days,application_expires_at,posted_by_email,posted_by_name,domain,experience_level)
      VALUES($1,$2,$3,$4,$5,$6::int,$7::int,NOW() + make_interval(days => $7::int),$8,$9,$10,$11)`,
      [
        title,
        skills,
        location,
        stipend,
        durationMonths,
        seats,
        openDays,
        companyEmail || null,
        companyName || null,
        domain || null,
        experienceLevel || null,
      ]
    );

    res.send("Internship posted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error posting internship: ${err.message || "unknown error"}`);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();

    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).send("Email and password are required");
    }

    const roleOrder =
      role === "company"
        ? [
            { table: "companies", role: "company" },
            { table: "students", role: "student" },
          ]
        : [
            { table: "students", role: "student" },
            { table: "companies", role: "company" },
          ];

    let user;
    let matchedRole;

    for (const candidate of roleOrder) {
      const result = await pool.query(`SELECT * FROM ${candidate.table} WHERE LOWER(email)=LOWER($1)`, [
        normalizedEmail,
      ]);
      if (result.rows[0]) {
        user = result.rows[0];
        matchedRole = candidate.role;
        break;
      }
    }

    if (!user) return res.status(400).send("User not found");

    let valid = false;
    const looksHashed = typeof user.password === "string" && user.password.startsWith("$2");

    if (looksHashed) {
      valid = await bcrypt.compare(normalizedPassword, user.password);
    } else {
      valid = normalizedPassword === user.password;
      if (valid) {
        const newHash = await bcrypt.hash(normalizedPassword, 10);
        const tableName = matchedRole === "company" ? "companies" : "students";
        await pool.query(`UPDATE ${tableName} SET password=$1 WHERE id=$2`, [newHash, user.id]);
      }
    }

    if (!valid) return res.status(400).send("Wrong password");

    const token = jwt.sign({ id: user.id, role: matchedRole }, SECRET);
    res.json({ token, role: matchedRole, email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).send("Login failed");
  }
});

app.get("/company/internships", async (req, res) => {
  const companyEmail = (req.query.email || "").trim().toLowerCase();
  let result;

  if (companyEmail) {
    result = await pool.query(
      "SELECT * FROM internships WHERE LOWER(posted_by_email)=LOWER($1) ORDER BY id DESC",
      [companyEmail]
    );
  } else {
    result = await pool.query("SELECT * FROM internships ORDER BY id DESC");
  }

  res.json(result.rows);
});

app.delete("/company/internships/:id", async (req, res) => {
  try {
    const internshipId = req.params.id;
    const companyEmail = (req.body.companyEmail || "").trim().toLowerCase();

    if (!companyEmail) return res.status(400).send("companyEmail is required");

    const result = await pool.query(
      `DELETE FROM internships
       WHERE id=$1 AND LOWER(posted_by_email)=LOWER($2)
       RETURNING id`,
      [internshipId, companyEmail]
    );

    if (!result.rows[0]) {
      return res.status(404).send("Internship not found or not allowed to delete");
    }

    res.send("Internship deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to delete internship");
  }
});

app.put("/company/internships/:id", async (req, res) => {
  try {
    const internshipId = req.params.id;
    const companyEmail = String(req.body.companyEmail || "").trim().toLowerCase();
    if (!companyEmail) return res.status(400).send("companyEmail is required");

    const existingResult = await pool.query(
      "SELECT * FROM internships WHERE id=$1 AND LOWER(posted_by_email)=LOWER($2)",
      [internshipId, companyEmail]
    );
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).send("Internship not found or not allowed to edit");

    const nextTitle = String(req.body.title ?? existing.title ?? "").trim();
    const nextSkills = String(req.body.skills ?? existing.skills ?? "").trim();
    const nextLocation = String(req.body.location ?? existing.location ?? "").trim();
    const nextStipend = Number(req.body.stipend ?? existing.stipend ?? 0);
    const nextDurationMonths = String(req.body.durationMonths ?? existing.duration_months ?? "").trim();
    const nextDomain = String(req.body.domain ?? existing.domain ?? "").trim();
    const nextExperienceLevel = String(req.body.experienceLevel ?? existing.experience_level ?? "").trim();

    if (!nextTitle) return res.status(400).send("Title is required");
    if (!nextSkills) return res.status(400).send("Skills are required");
    if (!nextDurationMonths) return res.status(400).send("Duration is required");
    if (!Number.isFinite(nextStipend) || nextStipend < 0) return res.status(400).send("Stipend is invalid");

    const seatsRaw = req.body.seatsRequired ?? existing.seats_required;
    const openDaysRaw = req.body.applicationOpenDays ?? existing.application_open_days ?? 30;

    const nextSeats = parseNonNegativeInt(seatsRaw);
    if (nextSeats === null) return res.status(400).send("Seats required must be 0 or a positive integer");

    const nextOpenDays = parseOpenDays(openDaysRaw);
    if (!nextOpenDays) return res.status(400).send("Application open duration (days) must be a positive integer");

    await pool.query(
      `UPDATE internships
       SET title=$1,
           skills=$2,
           location=$3,
           stipend=$4,
           duration_months=$5,
           seats_required=$6,
           application_open_days=$7,
           application_expires_at=NOW() + make_interval(days => $7::int),
           domain=$8,
           experience_level=$9
       WHERE id=$10 AND LOWER(posted_by_email)=LOWER($11)`,
      [
        nextTitle,
        nextSkills,
        nextLocation,
        nextStipend,
        nextDurationMonths,
        nextSeats,
        nextOpenDays,
        nextDomain || null,
        nextExperienceLevel || null,
        internshipId,
        companyEmail,
      ]
    );

    res.send("Internship updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update internship");
  }
});

app.post("/apply-internship", upload.single("resume"), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      internshipId,
      studentEmail,
      studentName,
      preferredDomain,
      preferredLocation,
      skills,
      expectedStipend,
      durationMonths,
      experienceLevel,
    } = req.body;

    if (!internshipId || !studentEmail) {
      return res.status(400).send("internshipId and studentEmail are required");
    }
    if (!req.file) {
      return res.status(400).send("Resume is required");
    }
    if (!isPdfUpload(req.file)) {
      if (req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).send("Only PDF resumes are allowed");
    }
    const normalizedStudentEmail = (studentEmail || "").trim().toLowerCase();

    await client.query("BEGIN");
    const rollbackAndSend = async (status, message) => {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
      return res.status(status).send(message);
    };

    const internshipResult = await client.query("SELECT * FROM internships WHERE id=$1 FOR UPDATE", [internshipId]);
    const internship = internshipResult.rows[0];

    if (!internship) return rollbackAndSend(404, "Internship not found");
    if (
      internship.application_expires_at &&
      new Date(internship.application_expires_at).getTime() <= Date.now()
    ) {
      return rollbackAndSend(400, "This internship has expired and is no longer accepting applications");
    }
    if (typeof internship.seats_required === "number" && internship.seats_required <= 0) {
      return rollbackAndSend(400, "No seats available for this internship");
    }

    const duplicateCheck = await client.query(
      "SELECT id FROM internship_applications WHERE internship_id=$1 AND LOWER(student_email)=LOWER($2)",
      [internshipId, normalizedStudentEmail]
    );

    if (duplicateCheck.rows[0]) {
      return rollbackAndSend(400, "You already applied to this internship");
    }

    await client.query(
      `INSERT INTO internship_applications
      (internship_id, company_email, student_email, student_name, preferred_domain, preferred_location, skills, expected_stipend, duration_months, experience_level, resume_filename)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        internshipId,
        internship.posted_by_email || null,
        normalizedStudentEmail,
        studentName || null,
        preferredDomain || null,
        preferredLocation || null,
        skills || null,
        expectedStipend || null,
        durationMonths || null,
        experienceLevel || null,
        req.file.filename,
      ]
    );

    if (typeof internship.seats_required === "number") {
      const seatUpdate = await client.query(
        "UPDATE internships SET seats_required = seats_required - 1 WHERE id=$1 AND seats_required > 0 RETURNING seats_required",
        [internshipId]
      );
      if (!seatUpdate.rows[0]) {
        return rollbackAndSend(400, "No seats available for this internship");
      }
    }

    await client.query("COMMIT");

    res.send("Applied successfully");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error(err);
    res.status(500).send("Failed to apply");
  } finally {
    client.release();
  }
});

app.get("/company/applications/:id/resume", async (req, res) => {
  try {
    const applicationId = req.params.id;
    const companyEmail = (req.query.email || "").trim().toLowerCase();
    if (!companyEmail) return res.status(400).send("email query is required");

    const result = await pool.query(
      `SELECT id, resume_filename, company_email
       FROM internship_applications
       WHERE id=$1 AND LOWER(company_email)=LOWER($2)`,
      [applicationId, companyEmail]
    );

    const appRow = result.rows[0];
    if (!appRow) return res.status(404).send("Resume not found");
    if (!appRow.resume_filename) return res.status(404).send("Resume not uploaded");

    const filePath = path.join(UPLOADS_DIR, appRow.resume_filename);
    if (!fs.existsSync(filePath)) return res.status(404).send("Resume file missing");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"resume_${applicationId}.pdf\"`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to download resume");
  }
});

app.get("/student/applications", async (req, res) => {
  try {
    const studentEmail = (req.query.email || "").trim().toLowerCase();
    if (!studentEmail) return res.status(400).send("email query is required");

    const result = await pool.query(
      `SELECT a.*, i.title, i.location, i.stipend
       FROM internship_applications a
       JOIN internships i ON i.id=a.internship_id
       WHERE LOWER(a.student_email)=LOWER($1)
       ORDER BY a.applied_at DESC`,
      [studentEmail]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch student applications");
  }
});

const cancelStudentApplication = async (req, res) => {
  const client = await pool.connect();
  try {
    const applicationId = req.params.id;
    const studentEmail = (req.body?.studentEmail || req.query?.studentEmail || "").trim().toLowerCase();
    if (!studentEmail) return res.status(400).send("studentEmail is required");

    await client.query("BEGIN");

    const applicationResult = await client.query(
      `SELECT id, internship_id
       FROM internship_applications
       WHERE id=$1 AND LOWER(student_email)=LOWER($2)
       FOR UPDATE`,
      [applicationId, studentEmail]
    );

    const application = applicationResult.rows[0];
    if (!application) {
      await client.query("ROLLBACK");
      return res.status(404).send("Application not found");
    }

    await client.query("DELETE FROM internship_applications WHERE id=$1", [applicationId]);

    await client.query(
      `UPDATE internships
       SET seats_required = CASE
         WHEN seats_required IS NULL THEN NULL
         ELSE seats_required + 1
       END
       WHERE id=$1`,
      [application.internship_id]
    );

    await client.query("COMMIT");
    res.send("Application cancelled successfully");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error(err);
    res.status(500).send("Failed to cancel application");
  } finally {
    client.release();
  }
};

app.delete("/student/applications/:id", cancelStudentApplication);
app.post("/student/applications/:id/cancel", cancelStudentApplication);

app.get("/company/applications", async (req, res) => {
  try {
    const companyEmail = (req.query.email || "").trim().toLowerCase();
    if (!companyEmail) return res.status(400).send("email query is required");

    const result = await pool.query(
      `SELECT a.*, i.title, i.location, i.stipend
       FROM internship_applications a
       JOIN internships i ON i.id=a.internship_id
       WHERE LOWER(a.company_email)=LOWER($1)
       ORDER BY a.applied_at DESC`,
      [companyEmail]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch company applications");
  }
});

app.post("/company/applications/:id/decision", async (req, res) => {
  const client = await pool.connect();
  try {
    const applicationId = req.params.id;
    const { status, companyEmail } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).send("status must be approved or rejected");
    }
    if (!companyEmail) return res.status(400).send("companyEmail is required");
    const normalizedCompanyEmail = String(companyEmail).trim().toLowerCase();

    await client.query("BEGIN");

    const appResult = await client.query(
      `SELECT id, internship_id, status
       FROM internship_applications
       WHERE id=$1 AND LOWER(company_email)=LOWER($2)
       FOR UPDATE`,
      [applicationId, normalizedCompanyEmail]
    );

    const application = appResult.rows[0];
    if (!application) {
      await client.query("ROLLBACK");
      return res.status(404).send("Application not found");
    }

    const previousStatus = application.status;

    if (previousStatus !== status) {
      if (status === "rejected" && previousStatus !== "rejected") {
        await client.query(
          `UPDATE internships
           SET seats_required = CASE
             WHEN seats_required IS NULL THEN NULL
             ELSE seats_required + 1
           END
           WHERE id=$1`,
          [application.internship_id]
        );
      }

      if (previousStatus === "rejected" && status !== "rejected") {
        const seatResult = await client.query(
          `UPDATE internships
           SET seats_required = seats_required - 1
           WHERE id=$1 AND seats_required > 0
           RETURNING id`,
          [application.internship_id]
        );

        if (!seatResult.rows[0]) {
          await client.query("ROLLBACK");
          return res.status(400).send("No seats available to change this decision");
        }
      }

      await client.query(
        `UPDATE internship_applications
         SET status=$1
         WHERE id=$2`,
        [status, applicationId]
      );
    }

    await client.query("COMMIT");
    res.send(`Application ${status}`);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error(err);
    res.status(500).send("Failed to update application status");
  } finally {
    client.release();
  }
});

module.exports = app;

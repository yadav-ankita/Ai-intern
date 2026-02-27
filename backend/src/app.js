const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const { pool, ensureSchema } = require("./config/db");
const { buildRecommendationProfile, scoreInternships } = require("./utils/recommendation");

const SECRET = process.env.JWT_SECRET || "aiinternsecret";
const BASE_DIR = path.resolve(__dirname, "..");
const UPLOADS_DIR = path.join(BASE_DIR, "uploads");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

const upload = multer({ dest: UPLOADS_DIR });

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
  const result = await pool.query("SELECT * FROM internships");
  const scored = scoreInternships(result.rows, buildRecommendationProfile(profileInput));
  return scored.slice(0, limit);
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

app.post("/post-internship", async (req, res) => {
  try {
    const {
      title,
      skills,
      location,
      stipend,
      durationMonths,
      companyEmail,
      companyName,
      domain,
      experienceLevel,
    } = req.body;

    if (!durationMonths || !String(durationMonths).trim()) {
      return res.status(400).send("Duration is required");
    }

    await pool.query(
      `INSERT INTO internships
      (title,skills,location,stipend,duration_months,posted_by_email,posted_by_name,domain,experience_level)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        title,
        skills,
        location,
        stipend,
        durationMonths,
        companyEmail || null,
        companyName || null,
        domain || null,
        experienceLevel || null,
      ]
    );

    res.send("Internship posted successfully");
  } catch (err) {
    console.log(err);
    res.send("Error posting internship");
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

app.post("/apply-internship", upload.single("resume"), async (req, res) => {
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
    if (req.file.mimetype !== "application/pdf") {
      if (req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).send("Only PDF resumes are allowed");
    }

    const internshipResult = await pool.query("SELECT * FROM internships WHERE id=$1", [internshipId]);
    const internship = internshipResult.rows[0];

    if (!internship) return res.status(404).send("Internship not found");

    const duplicateCheck = await pool.query(
      "SELECT id FROM internship_applications WHERE internship_id=$1 AND LOWER(student_email)=LOWER($2)",
      [internshipId, studentEmail]
    );

    if (duplicateCheck.rows[0]) {
      return res.status(400).send("You already applied to this internship");
    }

    await pool.query(
      `INSERT INTO internship_applications
      (internship_id, company_email, student_email, student_name, preferred_domain, preferred_location, skills, expected_stipend, duration_months, experience_level, resume_filename)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        internshipId,
        internship.posted_by_email || null,
        (studentEmail || "").trim().toLowerCase(),
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

    res.send("Applied successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to apply");
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
  try {
    const applicationId = req.params.id;
    const { status, companyEmail } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).send("status must be approved or rejected");
    }
    if (!companyEmail) return res.status(400).send("companyEmail is required");

    const result = await pool.query(
      `UPDATE internship_applications
       SET status=$1
       WHERE id=$2 AND LOWER(company_email)=LOWER($3)
       RETURNING *`,
      [status, applicationId, companyEmail]
    );

    if (!result.rows[0]) return res.status(404).send("Application not found");

    res.send(`Application ${status}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update application status");
  }
});

module.exports = app;

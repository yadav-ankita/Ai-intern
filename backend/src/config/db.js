const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "internship_AI",
  password: process.env.DB_PASSWORD || "1234",
  port: Number(process.env.DB_PORT || 5432),
});

const ensureSchema = async () => {
  try {
    await pool.query(`
      ALTER TABLE internships
      ADD COLUMN IF NOT EXISTS posted_by_email TEXT,
      ADD COLUMN IF NOT EXISTS posted_by_name TEXT,
      ADD COLUMN IF NOT EXISTS domain TEXT,
      ADD COLUMN IF NOT EXISTS experience_level TEXT,
      ADD COLUMN IF NOT EXISTS duration_months TEXT,
      ADD COLUMN IF NOT EXISTS application_open_days INTEGER,
      ADD COLUMN IF NOT EXISTS application_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS seats_required INTEGER;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS internship_applications (
        id SERIAL PRIMARY KEY,
        internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
        company_email TEXT,
        student_email TEXT NOT NULL,
        student_name TEXT,
        preferred_domain TEXT,
        preferred_location TEXT,
        skills TEXT,
        expected_stipend TEXT,
        duration_months TEXT,
        experience_level TEXT,
        resume_filename TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_internship_applications_status'
        ) THEN
          ALTER TABLE internship_applications
          ADD CONSTRAINT chk_internship_applications_status
          CHECK (status IN ('pending', 'approved', 'rejected'));
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_internship_applications_unique_student_per_internship'
        ) THEN
          ALTER TABLE internship_applications
          ADD CONSTRAINT uq_internship_applications_unique_student_per_internship
          UNIQUE (internship_id, student_email);
        END IF;
      END $$;
    `);
  } catch (err) {
    console.error("Schema setup failed:", err);
  }
};

module.exports = { pool, ensureSchema };

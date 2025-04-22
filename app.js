/**
 * Course Management System - Main Server File
 * Here wi  handle CRUD ops for courses using Express and Postgres
 */

// --- importing modules we need ---
const express = require("express");
const { Client } = require("pg");
require("dotenv").config();
const path = require("path");

// --- express app setup ---
const app = express();
app.set("view engine", "ejs"); //i use EJS to render the pages
app.set("views", path.join(__dirname, "views")); // folder for views
app.use(express.static(path.join(__dirname, "public"))); // public folder for css/images etc
app.use(express.urlencoded({ extended: true })); // this lets me grab form data

// --- connect to PostgreSQL db ---
const client = new Client({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { 
    rejectUnauthorized: false,
    sslmode: 'require'
  }
});

client.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("Connection failed:", err));

// --- Routes start here ---

/**
 * GET /
 * home page - show all courses from db
 */
app.get("/", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM courses ORDER BY created_at DESC");
    res.render("index", { courses: result.rows });
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).render("error", { message: "Failed to load courses" });
  }
});

/**
 * GET /add-course
 * shows the form to add a new course
 */
app.get("/add-course", (req, res) => {
  res.render("add-course", { error: null, values: {} });
});
app.get("/about", (req, res) => {
  const dbInfo = {
    type: "PostgreSQL",
    host: process.env.DB_HOST
  };

  res.render("about", { dbInfo });
});

/**
 * POST /add-course
 * handles form submit and insert course into db
 */
app.post("/add-course", async (req, res) => {
  const errors = validateCourseInput(req.body);
  if (errors.length > 0) {
    return res.render("add-course", {
      error: errors.join("<br>"),
      values: req.body
    });
  }

  try {
    // check if course with same code already exists
    const existing = await client.query("SELECT * FROM courses WHERE coursecode = $1", [req.body.coursecode.toUpperCase()]);
    if (existing.rows.length > 0) {
      return res.render("add-course", {
        error: "A course with this code already exists.",
        values: req.body
      });
    }

    // if not exist, insert it
    await insertCourse(req.body);
    res.redirect("/");
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

// --- helper functions ---

/**
 * check if course input is valid or not
 */
function validateCourseInput(data) {
  const errors = [];
  const { coursecode, coursename, syllabus, progression } = data;

  // check code like DT207G
  if (!/^[A-Z]{2}\d{3}[A-Z]$/.test(coursecode)) {
    errors.push("Course code must follow format (e.g. DT207G)");
  }

  if (!coursename?.trim() || coursename.length < 3) {
    errors.push("Course name must be at least 3 characters");
  }

  if (!syllabus?.startsWith("http")) {
    errors.push("Invalid syllabus URL format");
  }

  if (!["A", "B", "C", "D"].includes(progression?.toUpperCase())) {
    errors.push("Progression must be A, B, C, or D");
  }

  return errors;
}

/**
 * insert the course into the db
 */
async function insertCourse(courseData) {
  const { coursecode, coursename, syllabus, progression } = courseData;

  await client.query(
    `INSERT INTO courses (coursecode, coursename, syllabus, progression)
     VALUES ($1, $2, $3, $4)`,
    [coursecode.toUpperCase(), coursename.trim(), syllabus, progression.toUpperCase()]
  );
}

/**
 * handle db errors and show message
 */
function handleDatabaseError(err, res) {
  console.error("Database error:", err);
  res.status(500).render("error", { message: "An error occurred while accessing the database." });
}
/**
 * POST /delete-course
 * handles deleting a course by its ID
 */
app.post("/delete-course", async (req, res) => {
  const { courseid } = req.body;

  try {
    await client.query("DELETE FROM courses WHERE id = $1", [courseid]);
    res.redirect("/");
  } catch (err) {
    handleDatabaseError(err, res);
  }
});
// --- start the server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
});

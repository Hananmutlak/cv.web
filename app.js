/**
 * Course Management System - Main Server File
 * Implements CRUD operations for courses
 */

// Required modules
const express = require("express");
const { Client } = require("pg");
require("dotenv").config();
const path = require("path");

// Initialize Express app
const app = express();

// Configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Database configuration
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

// Connect to database
client.connect()
  .then(() => console.log(" Connected to PostgreSQL database"))
  .catch(err => console.error(" Connection error", err));

// Routes
// Home route - Show all courses
app.get("/", async (req, res) => {
  try {
    const result = await client.query(`
      SELECT * FROM courses 
      ORDER BY created_at DESC
    `);
    res.render("index", { courses: result.rows });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).render("error", { 
      message: "Error retrieving courses" 
    });
  }
});

// Add course form
app.get("/add-course", (req, res) => {
  res.render("add-course", { error: null });
});

// Handle course submission
app.post("/add-course", async (req, res) => {
  const { coursecode, coursename, syllabus, progression } = req.body;
  const errors = [];

  // Validation
  if (!/^[A-Za-z]{2}\d{4}$/.test(coursecode)) {
    errors.push("Course code must follow format (e.g. DT207G)");
  }
  
  if (!coursename || coursename.length < 3) {
    errors.push("Course name must be at least 3 characters");
  }

  if (!/^https?:\/\//.test(syllabus)) {
    errors.push("Invalid syllabus URL format");
  }

  if (!["A", "B"].includes(progression.toUpperCase())) {
    errors.push("Progression must be A or B");
  }

  if (errors.length > 0) {
    return res.render("add-course", { error: errors.join("<br>") });
  }

  try {
    // Check for existing course
    const exists = await client.query(
      "SELECT * FROM courses WHERE coursecode = $1",
      [coursecode.toUpperCase()]
    );
    
    if (exists.rows.length > 0) {
      return res.render("add-course", {
        error: "Course code already exists"
      });
    }

    // Insert new course
    await client.query(
      `INSERT INTO courses 
      (coursecode, coursename, syllabus, progression)
      VALUES ($1, $2, $3, $4)`,
      [
        coursecode.toUpperCase(),
        coursename,
        syllabus,
        progression.toUpperCase()
      ]
    );
    
    res.redirect("/");
  } catch (err) {
    console.error("Insert error:", err);
    res.render("add-course", { 
      error: "Error saving course to database" 
    });
  }
});

// Delete course
app.post("/delete-course/:id", async (req, res) => {
  try {
    await client.query("DELETE FROM courses WHERE id = $1", [req.params.id]);
    res.redirect("/");
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).render("error", { 
      message: "Error deleting course" 
    });
  }
});

// About page
app.get("/about", (req, res) => {
  res.render("about", {
    dbInfo: {
      host: process.env.DB_HOST,
      type: "PostgreSQL"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", { 
    message: "Internal Server Error" 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
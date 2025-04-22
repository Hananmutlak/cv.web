const { Client } = require("pg");
require("dotenv").config();

async function install() {
  const client = new Client({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
      rejectUnauthorized: false // Required when connecting to services like Render
    }
  });

  try {
    await client.connect();
    console.log("Connected to the server");

    const sql = `
      DROP TABLE IF EXISTS courses CASCADE;
      
      CREATE TABLE courses (
        id SERIAL PRIMARY KEY,
        coursecode VARCHAR(10) NOT NULL UNIQUE,
        coursename VARCHAR(64) NOT NULL,
        syllabus TEXT NOT NULL,
        progression CHAR(1) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(sql);
    console.log("Tables created successfully");

    // Insert initial test data
    await client.query(`
      INSERT INTO courses (coursecode, coursename, syllabus, progression)
      VALUES 
        ('DT207G', 'Backend-based Web Development', 'https://www.miun.se/utbildning/kursplaner-och-utbildningsplaner/DT207G/', 'B'),
        ('DT200G', 'Graphic Techniques for the Web', 'https://www.miun.se/utbildning/kursplaner-och-utbildningsplaner/DT200G/', 'A');
    `);
    console.log("Test data inserted");

  } catch (error) {
    console.error("An error occurred while working with the database:", error);
  } finally {
    await client.end();
  }
}

install();

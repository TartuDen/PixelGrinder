// index.js


import express from "express";
import sqlite3 from "sqlite3";
const app = express();

// Create or open the database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

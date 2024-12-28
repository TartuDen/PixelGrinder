/*******************************************************
 * createTables.js
 * 
 * Run this script once (e.g. `node createTables.js`)
 * to ensure your SQLite database has the required table(s).
 *******************************************************/
import sqlite3 from 'sqlite3';

// Path to your SQLite database file
// It will be created if it doesn't exist
const DB_PATH = './database.sqlite';

// 1) Open (or create) the database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    return console.error('Could not open database', err);
  }
  console.log('Connected to SQLite database:', DB_PATH);
});
7
// 2) Serialize ensures the following operations 
//    happen in sequence
db.serialize(() => {
  /*******************************************************
   * CREATE TABLE: players
   * 
   * This single table contains:
   *   - Player identity (playerName)
   *   - Total XP (totalExp)
   *   - Basic stats (int_stat, str_stat, etc.)
   *   - Main stats (health, mana)
   *   - Equipped items (weapon, armor_*)
   *   - Backpack (as JSON)
   *******************************************************/
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerName TEXT,
      totalExp INTEGER,

      int_stat INTEGER,
      str_stat INTEGER,
      dex_stat INTEGER,
      con_stat INTEGER,

      health INTEGER,
      mana INTEGER,

      weapon TEXT,
      armor_head TEXT,
      armor_chest TEXT,
      armor_shoulders TEXT,
      armor_legs TEXT,
      armor_feet TEXT,

      backpack TEXT  -- store the entire backpack as JSON
    )
  `);

  console.log('Players table created/verified.');
});

// 3) Close the database connection
db.close((err) => {
  if (err) {
    return console.error('Error closing database', err);
  }
  console.log('Database connection closed.');
});

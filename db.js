// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to a database file. If it doesn't exist, it will be created.
const dbPath = path.resolve(__dirname, 'pauls_cleaning_crew.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create tables if they don't exist
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            service TEXT NOT NULL,
            price REAL NOT NULL,
            status TEXT DEFAULT 'Scheduled', -- e.g., 'Scheduled', 'Completed', 'Cancelled'
            notes TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )`);
    }
});

module.exports = db;
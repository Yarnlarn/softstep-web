const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    // สร้างตาราง products
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        type TEXT,
        stock INTEGER,
        image TEXT,
        isActive BOOLEAN
    )`);

    // สร้างตาราง orders
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        orderId TEXT PRIMARY KEY,
        orderDate TEXT,
        items TEXT,
        status TEXT
    )`);
});

db.close();
console.log('Database tables created successfully.');
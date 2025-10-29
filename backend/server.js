const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const http = require('http');
const { Server } = require("socket.io");
const { Pool } = require('pg'); // <-- 1. เปลี่ยนจาก sqlite3 มาเป็น pg

// --- 2. ตั้งค่าการเชื่อมต่อฐานข้อมูล ---
// !!! ⬇️⬇️⬇️ วาง "Internal Connection String" ที่คัดลอกมาจาก Render ตรงนี้ ⬇️⬇️⬇️ !!!
const connectionString = 'postgresql://softstep_db_user:BKXBpBMczVFrGHTRdyQBabtNvOTID0uL@dpg-d3vk6ts9c44c738800ug-a/softstep_db';

const db = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // จำเป็นสำหรับ Render
    }
});

// --- 3. ฟังก์ชันสร้างตาราง (สำหรับ PostgreSQL) ---
async function createTables() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT,
                category TEXT,
                type TEXT,
                stock INTEGER,
                image TEXT,
                isActive BOOLEAN
            );
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                orderId TEXT PRIMARY KEY,
                orderDate TEXT,
                items JSONB,
                status TEXT
            );
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT
            );
        `);
        console.log('Database tables verified/created successfully.');
        await seedAdminUser();
    } catch (err) {
        console.error("Error creating tables:", err);
    }
}

// --- 4. ฟังก์ชันสร้าง Admin User (สำหรับ PostgreSQL) ---
async function seedAdminUser() {
    const defaultUsername = 'admin';
    const defaultPassword = 'password123';
    const defaultRole = 'admin';
    
    try {
        const check = await db.query("SELECT * FROM users WHERE username = $1", [defaultUsername]);
        if (check.rows.length === 0) {
            const hash = await bcrypt.hash(defaultPassword, saltRounds);
            await db.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [defaultUsername, hash, defaultRole]);
            console.log("Default admin user created!");
        }
    } catch (err) {
        console.error("Error seeding admin user:", err);
    }
}

// --- Server and Middleware Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const port = process.env.PORT || 3000; // ใช้สำหรับ Render

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'images/'),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// === PRODUCT APIs (ใช้ PostgreSQL) ===
app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM products ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const imgResult = await db.query("SELECT image FROM products WHERE id = $1", [id]);
        if (imgResult.rows[0] && imgResult.rows[0].image) {
            fs.unlink(path.join(__dirname, imgResult.rows[0].image), () => {});
        }
        await db.query("DELETE FROM products WHERE id = $1", [id]);
        res.status(200).json({ message: 'Product deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', upload.single('productImage'), async (req, res) => {
    try {
        const { id, name, category, type, stock } = req.body;
        const image = req.file ? `images/${req.file.filename}` : null;
        const isActive = true;
        const sql = `INSERT INTO products (id, name, category, type, stock, image, isActive) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        await db.query(sql, [id, name, category, type, parseInt(stock), image, isActive]);
        res.status(201).json({ id, ...req.body, image, isActive });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: `Product with ID ${req.body.id} already exists.` });
        return res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', upload.single('productImage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, type, stock } = req.body;
        
        let sql = `UPDATE products SET name = $1, category = $2, type = $3, stock = $4`;
        const params = [name, category, type, parseInt(stock)];
        
        if (req.file) {
            sql += `, image = $${params.length + 1}`;
            params.push(`images/${req.file.filename}`);
        }
        
        sql += ` WHERE id = $${params.length + 1}`;
        params.push(id);

        const result = await db.query(sql, params);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Product updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/products/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        await db.query("UPDATE products SET isActive = $1 WHERE id = $2", [isActive, id]);
        res.status(200).json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// === ORDER APIs (ใช้ PostgreSQL) ===
app.post('/api/orders', async (req, res) => {
    try {
        const cartItems = req.body;
        if (!cartItems || cartItems.length === 0) return res.status(400).json({ message: 'Cart is empty.' });
        const orderId = `ORD-${String(Date.now()).slice(-6)}`;
        const orderDate = new Date().toISOString();
        const itemsJson = JSON.stringify(cartItems);
        const status = 'Pending';
        const sql = `INSERT INTO orders (orderId, orderDate, items, status) VALUES ($1, $2, $3, $4)`;
        await db.query(sql, [orderId, orderDate, itemsJson, status]);
        
        const countResult = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");
        io.emit('new_order_notification', { count: parseInt(countResult.rows[0].count) });
        
        res.status(201).json({ message: 'Order received successfully!', order: { orderId, orderDate, items: cartItems, status } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM orders ORDER BY orderDate DESC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders/pending-count', async (req, res) => {
    try {
        const result = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/orders/:orderId/confirm', async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderResult = await db.query("SELECT * FROM orders WHERE orderId = $1", [orderId]);
        if (orderResult.rows.length === 0 || orderResult.rows[0].status === 'Confirmed') {
            return res.status(404).json({ message: 'Order not found or already confirmed' });
        }
        
        const items = orderResult.rows[0].items;
        for (const item of items) {
            await db.query("UPDATE products SET stock = stock - $1, isActive = CASE WHEN (stock - $1) <= 0 THEN false ELSE isActive END WHERE id = $2", [item.quantity, item.id]);
        }
        
        await db.query("UPDATE orders SET status = 'Confirmed' WHERE orderId = $1", [orderId]);
        
        const countResult = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");
        io.emit('new_order_notification', { count: parseInt(countResult.rows[0].count) });
        
        res.status(200).json({ message: 'Order confirmed and stock updated' });
    } catch (err) { res.status(500).json({ error: "Failed to update stock", details: err.message }); }
});

// === USER APIs (ใช้ PostgreSQL) ===
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Incorrect username or password' });
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.status(200).json({ message: 'Login successful', role: user.role });
        } else {
            res.status(401).json({ message: 'Incorrect username or password' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, username, role FROM users");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const hash = await bcrypt.hash(password, saltRounds);
        const sql = `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id`;
        const result = await db.query(sql, [username, hash, role]);
        res.status(201).json({ id: result.rows[0].id, username, role });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: 'Username already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM users WHERE id = $1", [id]);
        res.status(200).json({ message: 'User deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { password, role } = req.body;
        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, saltRounds);
            await db.query("UPDATE users SET password = $1, role = $2 WHERE id = $3", [hash, role, id]);
        } else {
            await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
        }
        res.status(200).json({ message: 'User updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Start Server ---
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  createTables(); // รันฟังก์ชันสร้างตารางเมื่อเซิร์ฟเวอร์เริ่ม
});
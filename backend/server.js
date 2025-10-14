const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const http = require('http');
const { Server } = require("socket.io");

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // --- VVV เพิ่มส่วนนี้: สร้าง Admin User เริ่มต้น VVV ---
        seedAdminUser();
    }
});

// --- VVV ฟังก์ชันใหม่สำหรับสร้าง Admin User เริ่มต้น VVV ---
function seedAdminUser() {
    const defaultUsername = 'admin';
    const defaultPassword = 'password123';

    db.get("SELECT * FROM users WHERE username = ?", [defaultUsername], (err, row) => {
        if (err) {
            console.error("Error checking for admin user:", err.message);
            return;
        }
        // ถ้ายังไม่มี user 'admin' ในระบบ
        if (!row) {
            bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
                if (err) {
                    console.error("Error hashing password:", err);
                    return;
                }
                db.run('INSERT INTO users (username, password) VALUES (?, ?)', [defaultUsername, hash], (err) => {
                    if (err) {
                        console.error("Error creating default admin user:", err.message);
                    } else {
                        console.log("Default admin user created successfully! (admin/password123)");
                    }
                });
            });
        }
    });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] }
});
const port = 3000;

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'images/'),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// === PRODUCT APIs ===
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(row => row.isActive = Boolean(row.isActive));
        res.json(rows);
    });
});
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT image FROM products WHERE id = ?", [id], (err, row) => {
        if (row && row.image) fs.unlink(path.join(__dirname, row.image), () => {});
    });
    db.run("DELETE FROM products WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Product deleted' });
    });
});
app.post('/api/products', upload.single('productImage'), (req, res) => {
    const { id, name, category, type, stock } = req.body;
    const image = req.file ? `images/${req.file.filename}` : null;
    const isActive = true;
    const sql = `INSERT INTO products (id, name, category, type, stock, image, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [id, name, category, type, stock, image, isActive], function(err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ message: `Product with ID ${id} already exists.` });
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, ...req.body, image, isActive });
    });
});
app.put('/api/products/:id', upload.single('productImage'), (req, res) => {
    const { id } = req.params;
    const { name, category, type, stock } = req.body;
    let sql = `UPDATE products SET name = ?, category = ?, type = ?, stock = ?`;
    const params = [name, category, type, stock];
    if (req.file) {
        sql += `, image = ?`;
        params.push(`images/${req.file.filename}`);
    }
    sql += ` WHERE id = ?`;
    params.push(id);
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Product updated successfully' });
    });
});
app.patch('/api/products/:id/status', (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    db.run("UPDATE products SET isActive = ? WHERE id = ?", [isActive, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Status updated' });
    });
});

// === ORDER APIs ===
app.post('/api/orders', (req, res) => {
    const cartItems = req.body;
    if (!cartItems || cartItems.length === 0) return res.status(400).json({ message: 'Cart is empty.' });
    const orderId = `ORD-${String(Date.now()).slice(-6)}`;
    const orderDate = new Date().toISOString();
    const itemsJson = JSON.stringify(cartItems);
    const status = 'Pending';
    const sql = `INSERT INTO orders (orderId, orderDate, items, status) VALUES (?, ?, ?, ?)`;
    db.run(sql, [orderId, orderDate, itemsJson, status], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'", [], (err, row) => {
            if (!err) io.emit('new_order_notification', { count: row.count });
        });
        res.status(201).json({ message: 'Order received successfully!', order: { orderId, orderDate, items: cartItems, status } });
    });
});
app.get('/api/orders', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY orderDate DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(row => row.items = JSON.parse(row.items));
        res.json(rows);
    });
});
app.get('/api/orders/pending-count', (req, res) => {
    db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});
app.patch('/api/orders/:orderId/confirm', (req, res) => {
    const { orderId } = req.params;
    db.get("SELECT * FROM orders WHERE orderId = ?", [orderId], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order || order.status === 'Confirmed') return res.status(404).json({ message: 'Order not found or already confirmed' });
        const items = JSON.parse(order.items);
        const dbPromises = [];
        items.forEach(item => {
            const promise = new Promise((resolve, reject) => {
                const sql = "UPDATE products SET stock = stock - ?, isActive = CASE WHEN (stock - ?) <= 0 THEN 0 ELSE isActive END WHERE id = ?";
                db.run(sql, [item.quantity, item.quantity, item.id], (err) => {
                    if (err) reject(err);
                    resolve();
                });
            });
            dbPromises.push(promise);
        });
        Promise.all(dbPromises)
            .then(() => {
                db.run("UPDATE orders SET status = 'Confirmed' WHERE orderId = ?", [orderId], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'", [], (err, row) => {
                        if (!err) io.emit('new_order_notification', { count: row.count });
                    });
                    res.status(200).json({ message: 'Order confirmed and stock updated' });
                });
            })
            .catch(err => {
                res.status(500).json({ error: "Failed to update stock", details: err.message });
            });
    });
});

// === USER APIs ===
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ message: 'Incorrect username or password' });
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                res.status(200).json({ message: 'Login successful' });
            } else {
                res.status(401).json({ message: 'Incorrect username or password' });
            }
        });
    });
});
app.get('/api/users', (req, res) => {
    db.all("SELECT id, username FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/users', (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Error hashing password' });
        const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
        db.run(sql, [username, hash], function(err) {
            if (err) return res.status(400).json({ message: 'Username already exists' });
            res.status(201).json({ id: this.lastID, username });
        });
    });
});
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'User deleted' });
    });
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
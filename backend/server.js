const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// --- VVV เพิ่ม/แก้ไข สำหรับ Socket.IO VVV ---
const http = require('http');
const { Server } = require("socket.io");

// --- ตั้งค่าการเชื่อมต่อฐานข้อมูล ---
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to the SQLite database.');
});

const app = express();
const server = http.createServer(app); // สร้าง http server จาก express app
const io = new Server(server, { // สร้าง socket.io server
    cors: {
        origin: "*", // อนุญาตการเชื่อมต่อจากทุกที่
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
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
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.image) {
            fs.unlink(path.join(__dirname, row.image), (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting image file:", unlinkErr);
            });
        }
    });
    db.run("DELETE FROM products WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Product deleted successfully' });
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
        if (this.changes === 0) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Product updated successfully' });
    });
});

app.patch('/api/products/:id/status', (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    db.run("UPDATE products SET isActive = ? WHERE id = ?", [isActive, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Product not found' });
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
        
        // ส่งสัญญาณ Real-time ผ่าน Socket.IO
        db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'", [], (err, row) => {
            if (!err) {
                io.emit('new_order_notification', { count: row.count });
            }
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

                    // ส่งสัญญาณ Real-time ผ่าน Socket.IO
                    db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'", [], (err, row) => {
                        if (!err) {
                            io.emit('new_order_notification', { count: row.count });
                        }
                    });

                    res.status(200).json({ message: 'Order confirmed and stock updated' });
                });
            })
            .catch(err => {
                res.status(500).json({ error: "Failed to update stock", details: err.message });
            });
    });
});

// --- VVV แก้ไข: เปลี่ยนมาใช้ server.listen VVV ---
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
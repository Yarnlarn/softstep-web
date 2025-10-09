let products = [
    {
        id: 'SK001',
        name: 'Classic Crew Socks',
        category: 'Classic',
        type: 'Crew',
        stock: 150,
        image: 'images/1.png',
        isActive: true // <-- สถานะ
    },
    {
        id: 'SK002',
        name: 'Ankle Athletic Socks',
        category: 'Sport',
        type: 'Ankle',
        stock: 200,
        image: 'images/2.png',
        isActive: true // <-- สถานะ
    },
    {
        id: 'SK003',
        name: 'No-Show Casual Socks',
        category: 'Casual',
        type: 'No-Show',
        stock: 9,
        image: 'images/3.png',
        isActive: true // <-- สถานะ
    },
    {
        id: 'SK004',
        name: 'Wool Winter Socks',
        category: 'Winter',
        type: 'Crew',
        stock: 80,
        image: 'images/4.png',
        isActive: false // <-- สถานะ (ปิดใช้งาน)
    },
    {
        id: 'SK005',
        name: 'Colorful Pattern Socks',
        category: 'Fashion',
        type: 'Crew',
        stock: 180,
        image: 'images/5.png',
        isActive: true // <-- สถานะ
    }
];

// ใน Node.js เราต้อง export ตัวแปรเพื่อให้ไฟล์อื่นเรียกใช้ได้
module.exports = products;
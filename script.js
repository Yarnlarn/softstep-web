// รอให้เอกสาร HTML ทั้งหมดโหลดเสร็จก่อน จึงจะเริ่มทำงาน
document.addEventListener('DOMContentLoaded', () => {

    // ===================================
    // ส่วนที่ 1: Animation ถุงเท้า
    // ===================================
    const container = document.getElementById('background-animation');

    if (container) { // ตรวจสอบก่อนว่ามี container หรือไม่
        const numberOfSocks = 60;
        const sockImages = [
            'images/1.png', 'images/2.png', 'images/3.png',
            'images/4.png', 'images/5.png'
        ];

        for (let i = 0; i < numberOfSocks; i++) {
            const sockContainer = document.createElement('div');
            sockContainer.classList.add('sock');
            const sockImage = document.createElement('img');
            const randomImage = sockImages[Math.floor(Math.random() * sockImages.length)];
            
            // --- จุดที่แก้ไข ---
            // เปลี่ยนให้ดึงรูปภาพจาก Backend Server
            sockImage.src = `http://localhost:3000/${randomImage}`;

            sockContainer.style.left = (Math.random() * 100) + 'vw';
            sockContainer.style.width = (Math.random() * 30 + 25) + 'px';
            sockContainer.style.animationDuration = (Math.random() * 8 + 5) + 's';
            sockContainer.style.animationDelay = (Math.random() * 5) + 's';
            
            sockContainer.appendChild(sockImage);
            container.appendChild(sockContainer);
        }
    }

    // ===================================
    // ส่วนที่ 2: การควบคุม Modal Login ของ Admin
    // ===================================

    const adminButton = document.getElementById('adminBtn');
    const adminModal = document.getElementById('adminModal');
    
    if (adminButton && adminModal) {
        const closeModalButton = adminModal.querySelector('.close-button');
        const modalOverlay = adminModal.querySelector('.modal-overlay');
        const loginForm = adminModal.querySelector('.login-form');
        const usernameInput = adminModal.querySelector('#username');
        const passwordInput = adminModal.querySelector('#password');

        const openModal = (event) => {
            event.preventDefault(); // ป้องกันไม่ให้ลิงก์ '#' ทำให้หน้ากระโดด
            adminModal.classList.add('show');
        };

        const closeModal = () => {
            adminModal.classList.remove('show');
        };

        const handleLogin = (event) => {
            event.preventDefault(); // ป้องกันไม่ให้ฟอร์มรีเฟรชหน้าเว็บ

            const enteredUsername = usernameInput.value;
            const enteredPassword = passwordInput.value;

            // กำหนด Username และ Password ที่ถูกต้อง
            const correctUsername = "admin";
            const correctPassword = "1234";
            
            if (enteredUsername === correctUsername && enteredPassword === correctPassword) {
                alert('Login Successful!');
                // เมื่อล็อกอินสำเร็จ ให้ไปที่หน้าจัดการสินค้า
                window.location.href = 'manage-products.html'; 
            } else {
                // เมื่อล็อกอินไม่สำเร็จ ให้แจ้งเตือน
                alert('Username หรือ Password ไม่ถูกต้อง!');
            }
        };

        adminButton.addEventListener('click', openModal);
        closeModalButton.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', closeModal);
        loginForm.addEventListener('submit', handleLogin);
    }
});
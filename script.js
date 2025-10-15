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
            
            // !!! กรุณาเปลี่ยน 'https://softstep-backend.onrender.com' ให้เป็น URL จริงของ Backend บน Render ของคุณ
            sockImage.src = `https://softstep-backend.onrender.com/${randomImage}`;

            sockContainer.style.left = (Math.random() * 100) + 'vw';
            sockContainer.style.width = (Math.random() * 30 + 25) + 'px';
            sockContainer.style.animationDuration = (Math.random() * 8 + 5) + 's';
            sockContainer.style.animationDelay = (Math.random() * 5) + 's';
            
            sockContainer.appendChild(sockImage);
            container.appendChild(sockContainer);
        }
    }

    // ===================================
    // ส่วนที่ 2: การควบคุม Modal Login
    // ===================================

    const warehouseButton = document.getElementById('warehouseBtn');
    const adminButton = document.getElementById('adminBtn');
    const loginModal = document.getElementById('loginModal');
    
    if (loginModal) {
        const closeModalButton = loginModal.querySelector('.close-button');
        const modalOverlay = loginModal.querySelector('.modal-overlay');
        const loginForm = document.getElementById('login-form');
        const usernameInput = loginModal.querySelector('#username');
        const passwordInput = loginModal.querySelector('#password');
        
        // --- ส่วนที่แก้ไข ---
        // เราจะไม่ใช้ตัวแปรกลาง แต่จะให้ handleLogin ตัดสินใจเอง
        // let loginTargetUrl = ''; 

        const openModal = (event) => {
            event.preventDefault();
            loginModal.classList.add('show');
        };

        const closeModal = () => {
            loginModal.classList.remove('show');
        };

        // --- ส่วนที่แก้ไข ---
        // ฟังก์ชันจัดการการล็อกอินที่สมบูรณ์
        const handleLogin = async (event) => {
            event.preventDefault();
            const username = usernameInput.value;
            const password = passwordInput.value;

            try {
                // !!! กรุณาเปลี่ยน URL ให้เป็นของ Backend บน Render ของคุณ
                const response = await fetch('https://softstep-backend.onrender.com/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const data = await response.json(); // ดึงข้อมูล role ที่ส่งกลับมา
                    
                    // "จำ" สิทธิ์ของผู้ใช้ไว้ใน sessionStorage ของเบราว์เซอร์
                    sessionStorage.setItem('userRole', data.role);
                    
                    alert('Login Successful!');

                    // ตรวจสอบ role แล้วส่งไปหน้าที่ถูกต้อง
                    if (data.role === 'admin') {
                        window.location.href = 'users.html';
                    } else if (data.role === 'warehouse') {
                        window.location.href = 'manage-products.html';
                    } else {
                        alert('Unknown user role! Cannot redirect.');
                    }
                } else {
                    const errorData = await response.json();
                    alert(`Login Failed: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login.');
            }
        };

        // --- ส่วนที่แก้ไข ---
        // ทั้งสองปุ่มจะเรียกใช้ openModal แบบธรรมดาเหมือนกัน
        if (warehouseButton) {
            warehouseButton.addEventListener('click', openModal);
        }
        if (adminButton) {
            adminButton.addEventListener('click', openModal);
        }
        
        closeModalButton.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', closeModal);
        loginForm.addEventListener('submit', handleLogin);
    }
});
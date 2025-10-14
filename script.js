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

    const warehouseButton = document.getElementById('warehouseBtn'); // <-- แก้ไข: เลือก ID ของปุ่มให้ถูกต้อง
    const adminButton = document.getElementById('adminBtn');         // <-- แก้ไข: เลือกปุ่ม Admin
    const loginModal = document.getElementById('loginModal');        // <-- แก้ไข: id ของ Modal
    
    if (loginModal) {
        const closeModalButton = loginModal.querySelector('.close-button');
        const modalOverlay = loginModal.querySelector('.modal-overlay');
        const loginForm = document.getElementById('login-form');
        const usernameInput = loginModal.querySelector('#username');
        const passwordInput = loginModal.querySelector('#password');
        
        let loginTargetUrl = ''; // ตัวแปรสำหรับเก็บ URL ปลายทาง

        // ฟังก์ชันสำหรับเปิด Modal และกำหนดหน้าปลายทาง
        const openModal = (event, targetUrl) => {
            event.preventDefault();
            loginTargetUrl = targetUrl; // จำไว้ว่าผู้ใช้ต้องการไปที่ไหน
            loginModal.classList.add('show');
        };

        const closeModal = () => {
            loginModal.classList.remove('show');
        };

        // ฟังก์ชันจัดการการล็อกอิน (เชื่อมต่อ Backend)
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
                    alert('Login Successful!');
                    window.location.href = loginTargetUrl; // ไปยังหน้าที่ผู้ใช้ต้องการ
                } else {
                    const errorData = await response.json();
                    alert(`Login Failed: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login.');
            }
        };

        // --- ติดตั้ง Event Listeners ---
        if (warehouseButton) {
            warehouseButton.addEventListener('click', (event) => openModal(event, 'manage-products.html'));
        }
        if (adminButton) {
            adminButton.addEventListener('click', (event) => openModal(event, 'users.html'));
        }
        
        closeModalButton.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', closeModal);
        loginForm.addEventListener('submit', handleLogin);
    }
});
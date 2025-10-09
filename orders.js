document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Collapsible Sidebar Logic ---
    const sidebar = document.getElementById('sidebar');
    const contentWrapper = document.getElementById('content-wrapper');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');

    if (sidebar && contentWrapper && sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            contentWrapper.classList.toggle('full-width');
        });
    }

    // --- 2. Order Fetching and Display Logic ---
    const newOrdersList = document.getElementById('new-orders-list');
    const orderHistoryList = document.getElementById('order-history-list');
    const orderBadge = document.getElementById('order-badge');
    
    let allProducts = []; 

    // --- Image Modal Elements ---
    const imageModal = document.getElementById('imageModal');
    const fullSizeImage = document.getElementById('fullSizeImage');
    const imageModalCloseBtn = document.querySelector('.image-modal-close-button');
    const imageModalOverlay = document.querySelector('.image-modal-overlay');

    function openImageModal(imageUrl) {
        if (imageModal && fullSizeImage) {
            fullSizeImage.src = imageUrl;
            imageModal.classList.add('show');
        }
    }

    function closeImageModal() {
        if (imageModal) {
            imageModal.classList.remove('show');
            fullSizeImage.src = '';
        }
    }

    // --- ฟังก์ชันอัปเดต Order Badge (จะถูกเรียกใช้โดย Socket.IO) ---
    function updateOrderBadgeDisplay(count) {
        if (orderBadge) {
            if (count > 0) {
                orderBadge.textContent = count;
                orderBadge.classList.remove('hidden');
            } else {
                orderBadge.textContent = '0';
                orderBadge.classList.add('hidden');
            }
        }
    }

    // ฟังก์ชันสำหรับดึงข้อมูล Orders และ Products
    async function loadInitialData() {
        try {
            const [ordersResponse, productsResponse] = await Promise.all([
                fetch('https://softstep-web.onrender.com/api/orders'),
                fetch('https://softstep-web.onrender.com/api/products')
            ]);
            if (!ordersResponse.ok || !productsResponse.ok) throw new Error('Could not fetch initial data');
            const orders = await ordersResponse.json();
            allProducts = await productsResponse.json(); 
            displayOrders(orders);
        } catch (error) {
            console.error("Could not load data:", error);
            newOrdersList.innerHTML = '<p style="color: red;">Failed to load data.</p>';
        }
    }

    // ฟังก์ชันสำหรับแสดงผล Orders
    function displayOrders(orders) {
        newOrdersList.innerHTML = '';
        orderHistoryList.innerHTML = '';
        
        const pendingOrders = orders.filter(o => o.status === 'Pending');
        const confirmedOrders = orders.filter(o => o.status === 'Confirmed');

        if(pendingOrders.length === 0) newOrdersList.innerHTML = '<p>No new orders.</p>';
        if(confirmedOrders.length === 0) orderHistoryList.innerHTML = '<p>No order history.</p>';

        orders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            let itemsHtml = '<div class="order-item-list">';
            order.items.forEach(item => {
                const productInfo = allProducts.find(p => p.id === item.id);
                if (productInfo) {
                    const imageUrl = `https://softstep-web.onrender.com/${productInfo.image}`;
                    itemsHtml += `
                        <div class="order-item">
                            <img src="${imageUrl}" alt="${productInfo.name}" class="order-item-image" data-full-image="${imageUrl}">
                            <div class="order-item-info">
                                <h4>${productInfo.name} (ID: ${item.id})</h4>
                                <p><strong>Qty:</strong> ${item.quantity} | <strong>Price:</strong> ${item.price.toFixed(2)}</p>
                            </div>
                        </div>
                    `;
                }
            });
            itemsHtml += '</div>';
            orderCard.innerHTML = `
                <div class="order-header">
                    <h3>Order ID: ${order.orderId}</h3>
                    <span class="status ${order.status.toLowerCase()}">${order.status}</span>
                </div>
                <div class="order-body">
                    <div class="order-details"><p><strong>Date:</strong> ${new Date(order.orderDate).toLocaleString()}</p></div>
                    ${itemsHtml}
                </div>
                ${order.status === 'Pending' ? `<div class="order-actions"><button class="action-button primary confirm-btn" data-order-id="${order.orderId}">Confirm Order</button></div>` : ''}
            `;
            if (order.status === 'Pending') {
                newOrdersList.appendChild(orderCard);
            } else {
                orderHistoryList.appendChild(orderCard);
            }
        });
        addOrderActionListeners();
        addImageClickListeners();
    }

    // ฟังก์ชันติดตั้ง Listener ปุ่ม Confirm
    function addOrderActionListeners() {
        document.querySelectorAll('.confirm-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.replaceWith(newButton);
            newButton.addEventListener('click', async () => {
                const orderId = newButton.dataset.orderId;
                if (confirm(`Confirm order ${orderId}?`)) {
                    try {
                        const response = await fetch(`https://softstep-web.onrender.com/api/orders/${orderId}/confirm`, { method: 'PATCH' });
                        if (!response.ok) throw new Error('Failed to confirm order.');
                        await loadInitialData(); 
                    } catch (error) {
                        console.error('Error confirming order:', error);
                        alert('Failed to confirm order.');
                    }
                }
            });
        });
    }

    // ฟังก์ชันติดตั้ง Listener รูปภาพ
    function addImageClickListeners() {
        document.querySelectorAll('.order-item-image').forEach(img => {
            const newImg = img.cloneNode(true);
            img.replaceWith(newImg);
            newImg.addEventListener('click', (event) => {
                const fullImageUrl = event.target.dataset.fullImage;
                if (fullImageUrl) openImageModal(fullImageUrl);
            });
        });
    }

    // --- ติดตั้ง Listeners สำหรับ Image Modal ---
    if (imageModal) {
        imageModalCloseBtn.addEventListener('click', closeImageModal);
        imageModalOverlay.addEventListener('click', closeImageModal);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && imageModal.classList.contains('show')) {
                closeImageModal();
            }
        });
    }

    // --- เริ่มการทำงาน ---
    loadInitialData();
    
    // --- VVV ส่วนที่แก้ไข: เปลี่ยนมาใช้ Socket.IO VVV ---
    const socket = io("https://softstep-web.onrender.com");

    let previousOrderCount = 0; // ย้ายตัวแปรมาไว้ที่นี่
    socket.on("new_order_notification", (data) => {
        console.log("Real-time notification received on Orders page!", data);

        if (data.count > previousOrderCount) {
             const notificationSound = new Audio('../sounds/notification.mp3');
             notificationSound.play().catch(e => console.error("Error playing sound:", e));
        }
        previousOrderCount = data.count;

        updateOrderBadgeDisplay(data.count); // อัปเดตตัวเลข
        loadInitialData(); // โหลดข้อมูลออเดอร์ใหม่ทั้งหมดเพื่อให้หน้าจออัปเดตทันที
    });
});
document.addEventListener('DOMContentLoaded', () => {

    let products = [];
    let cart = [];

    // --- DOM Elements ---
    const API_BASE_URL = 'https://softstep-backend.onrender.com/api'; // ⚠️ ตรวจสอบ URL นี้ให้ตรงกับ External URL ของ Render
    const productGrid = document.getElementById('product-grid');
    const searchInput = document.getElementById('sale-search-input');
    const cartCountElement = document.getElementById('cart-count');
    const cartIcon = document.getElementById('cart-icon');
    const cartModal = document.getElementById('cartModal');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const sendOrderBtn = document.getElementById('send-order-btn');
    const closeModalButtons = document.querySelectorAll('.modal-container .close-button');
    const modalOverlays = document.querySelectorAll('.modal-container .modal-overlay');

    // --- 1. โหลดข้อมูลสินค้า ---
    async function loadProducts() {
        try {
            // ดึงข้อมูลจาก Backend ที่รันบน Render
            const response = await fetch(`${API_BASE_URL}/products`);
            if (!response.ok) throw new Error('Could not fetch products');
            products = await response.json();
            
            // เรียกใช้ฟังก์ชันกรองและแสดงผล
            applyFiltersAndDisplay();
        } catch (error) {
            console.error("Could not load products:", error);
            productGrid.innerHTML = '<p style="color: red; text-align: center;">Failed to load products. Please ensure the backend server is running and the API URL is correct.</p>';
        }
    }

    // --- 2. กรองและแสดงผล ---
    function applyFiltersAndDisplay() {
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredProducts = products.filter(product => {
            // 🐛 แก้ไข: PostgreSQL ส่งค่าเป็น 'isactive' (ตัวเล็ก)
            // เราต้องกรองเฉพาะสินค้าที่มี 'isactive' เป็น true (สำหรับ PostgreSQL)
            if (product.isactive !== true) return false; 
            
            if (searchTerm === '') return true;
            return (
                product.name.toLowerCase().includes(searchTerm) ||
                product.id.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm)
            );
        });

        displayProducts(filteredProducts);
    }

    // --- 3. สร้าง Card สินค้า ---
    function displayProducts(productList) {
        productGrid.innerHTML = '';
        if (productList.length === 0) {
            productGrid.innerHTML = '<p style="text-align: center;">No active products found.</p>';
            return;
        }

        productList.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            // ⚠️ ปรับปรุง: URL รูปภาพใช้ API_BASE_URL เพื่อความแม่นยำ
            const imageUrl = `${API_BASE_URL.replace('/api', '')}/${product.image}`;
            
            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${imageUrl}" alt="${product.name}">
                    ${product.stock <= 0 ? '<div class="out-of-stock-overlay"><span>สินค้าหมด</span></div>' : ''}
                </div>
                <div class="card-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-id">ID: ${product.id}</p>
                    <p class="product-stock">Stock: <span>${product.stock}</span></p>
                </div>
                <div class="card-expanded-content">
                    <div class="expanded-form-group"><label>Qty:</label><input type="number" class="quantity-input" min="1" value="1"></div>
                    <div class="expanded-form-group"><label>Price:</label><input type="number" class="price-input" step="0.01" placeholder="0.00"></div>
                    <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
                </div>
            `;
            productGrid.appendChild(card);
        });
        addEventListeners();
    }

    // --- 4. การทำงานของตะกร้าและอื่นๆ (โค้ดเดิม) ---
    // ... (ส่วน updateCartCount, displayCartItems, addEventListeners, Modal Handlers เหมือนเดิม) ...

    function addEventListeners() {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (event) => {
                if (event.target.closest('.card-expanded-content')) return;
                const isExpanded = card.classList.contains('expanded');
                document.querySelectorAll('.product-card').forEach(c => c.classList.remove('expanded'));
                if (!isExpanded) card.classList.add('expanded');
            });
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const productId = button.dataset.productId;
                const card = button.closest('.product-card');
                const quantity = card.querySelector('.quantity-input').value;
                const price = card.querySelector('.price-input').value;
                if (!quantity || quantity <= 0 || !price || price <= 0) {
                    alert('Please enter a valid quantity and price.');
                    return;
                }
                const item = { id: productId, quantity: parseInt(quantity), price: parseFloat(price) };
                cart.push(item);
                updateCartCount();
                alert(`Added ${quantity} of product ${productId} to cart!`);
                card.classList.remove('expanded');
            });
        });
    }

    function updateCartCount() {
        cartCountElement.textContent = cart.length;
    }

    function displayCartItems() {
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            return;
        }
        cart.forEach(item => {
            const productInfo = products.find(p => p.id === item.id);
            if (productInfo) {
                // ⚠️ ปรับปรุง: URL รูปภาพใช้ API_BASE_URL เพื่อความแม่นยำ
                const imageUrl = `${API_BASE_URL.replace('/api', '')}/${productInfo.image}`;
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `<img src="${imageUrl}" alt="${productInfo.name}"><div class="cart-item-info"><h4>${productInfo.name}</h4><p>Qty: ${item.quantity} | Price: ${item.price.toFixed(2)}</p></div>`;
                cartItemsContainer.appendChild(itemElement);
            }
        });
    }

    cartIcon.addEventListener('click', () => {
        displayCartItems();
        cartModal.classList.add('show');
    });

    sendOrderBtn.addEventListener('click', async () => {
        if (cart.length === 0) {
            alert('Your cart is empty. Cannot send order.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, { // ⚠️ ใช้ API_BASE_URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cart),
            });
            if (!response.ok) throw new Error('Failed to send order.');
            const result = await response.json();
            alert(`Order sent successfully! Your Order ID is: ${result.order.orderId}`);
            cart = [];
            updateCartCount();
            cartModal.classList.remove('show');
        } catch (error) {
            console.error('Error sending order:', error);
            alert('There was a problem sending your order. Please try again.');
        }
    });

    closeModalButtons.forEach(btn => btn.addEventListener('click', () => btn.closest('.modal-container').classList.remove('show')));
    modalOverlays.forEach(overlay => overlay.addEventListener('click', () => overlay.closest('.modal-container').classList.remove('show')));
    searchInput.addEventListener('input', applyFiltersAndDisplay);

    loadProducts();
});
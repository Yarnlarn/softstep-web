document.addEventListener('DOMContentLoaded', () => {

    let products = [];
    let cart = [];

    const productGrid = document.getElementById('product-grid');
    const searchInput = document.getElementById('sale-search-input');
    const cartCountElement = document.getElementById('cart-count');
    const cartIcon = document.getElementById('cart-icon');
    const cartModal = document.getElementById('cartModal');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const sendOrderBtn = document.getElementById('send-order-btn');
    const closeModalButtons = document.querySelectorAll('.modal-container .close-button');
    const modalOverlays = document.querySelectorAll('.modal-container .modal-overlay');

    async function loadProducts() {
        try {
            const response = await fetch('https://softstep-backend.onrender.co/api/products');
            if (!response.ok) throw new Error('Could not fetch products');
            products = await response.json();
            applyFiltersAndDisplay();
        } catch (error) {
            console.error("Could not load products:", error);
            productGrid.innerHTML = '<p style="color: red; text-align: center;">Failed to load products. Please ensure the backend server is running.</p>';
        }
    }

    function applyFiltersAndDisplay() {
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredProducts = products.filter(product => {
            if (!product.isActive) return false;
            if (searchTerm === '') return true;
            return (
                product.name.toLowerCase().includes(searchTerm) ||
                product.id.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm)
            );
        });

        displayProducts(filteredProducts);
    }

    function displayProducts(productList) {
        productGrid.innerHTML = '';
        productList.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="card-image-container">
                    <img src="https://softstep-backend.onrender.co/${product.image}" alt="${product.name}">
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
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `<img src="https://softstep-backend.onrender.co/${productInfo.image}" alt="${productInfo.name}"><div class="cart-item-info"><h4>${productInfo.name}</h4><p>Qty: ${item.quantity} | Price: ${item.price.toFixed(2)}</p></div>`;
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
            const response = await fetch('https://softstep-backend.onrender.co/api/orders', {
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
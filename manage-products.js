document.addEventListener('DOMContentLoaded', () => {

    let products = []; 

    const productGrid = document.getElementById('product-grid-admin');
    const addNewProductBtn = document.getElementById('add-new-product-btn');
    const productModal = document.getElementById('productModal');
    const searchInput = document.getElementById('search-input');
    const advancedFilterBtn = document.getElementById('advanced-filter-btn');
    const advancedFiltersContainer = document.getElementById('advanced-filters');
    const filterCategorySelect = document.getElementById('filter-category');
    const filterStatusSelect = document.getElementById('filter-status');
    const sidebar = document.getElementById('sidebar');
    const contentWrapper = document.getElementById('content-wrapper');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const orderBadge = document.getElementById('order-badge');

    if (!productGrid || !addNewProductBtn || !productModal || !searchInput) {
        console.error('Essential elements are missing from the page!');
        return;
    }
    
    const closeModalButton = productModal.querySelector('.close-button');
    const productForm = document.getElementById('product-form');
    const modalTitle = document.getElementById('modal-title');
    const productImageInput = document.getElementById('productImage');
    const imagePreview = document.getElementById('imagePreview');
    
    let currentEditId = null;

    async function updateOrderBadge() {
        try {
            const response = await fetch('https://softstep-web.onrender.com/api/orders/pending-count');
            if (!response.ok) return;
            const data = await response.json();
            if (orderBadge) {
                if (data.count > 0) {
                    orderBadge.textContent = data.count;
                    orderBadge.classList.remove('hidden');
                } else {
                    orderBadge.textContent = '0';
                    orderBadge.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Failed to update order badge:', error);
        }
    }

    async function loadProducts() {
        try {
            const response = await fetch('https://softstep-web.onrender.com/api/products');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            products = await response.json();
            applyFiltersAndDisplay();
            populateCategoryFilter();
        } catch (error) {
            console.error("Could not load products:", error);
            productGrid.innerHTML = '<p style="color: red; text-align: center;">Failed to load products. Please make sure the backend server is running.</p>';
        }
    }

    const openModalForAdd = () => {
        currentEditId = null;
        modalTitle.textContent = 'Add New Product';
        productForm.reset();
        imagePreview.src = '#';
        imagePreview.classList.remove('show');
        document.getElementById('productId').disabled = false;
        productModal.classList.add('show');
    };

    const openModalForEdit = (productId) => {
        currentEditId = productId;
        modalTitle.textContent = `Edit Product (ID: ${productId})`;
        const product = products.find(p => p.id === productId);
        if (!product) return;
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productType').value = product.type;
        document.getElementById('productStock').value = product.stock;
        
        if (product.image) {
            imagePreview.src = product.image.startsWith('blob:') ? product.image : `https://softstep-web.onrender.com/${product.image}`;
            imagePreview.classList.add('show');
        } else {
            imagePreview.classList.remove('show');
        }
        
        productModal.classList.add('show');
    };
    
    const closeModal = () => productModal.classList.remove('show');

    function displayAdminProducts(productList) {
        productGrid.innerHTML = '';
        productList.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card-admin';
            card.dataset.productId = product.id;
            const stockClass = product.stock < 10 ? 'low-stock' : '';
            const isChecked = product.isActive ? 'checked' : '';
            const imageUrl = product.image.startsWith('blob:') ? product.image : `https://softstep-web.onrender.com/${product.image}`;

            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.style.display='none'">
                    ${product.stock <= 0 ? '<div class="out-of-stock-overlay"><span>สินค้าหมด</span></div>' : ''}
                </div>
                <div class="card-body"><h3>${product.name}</h3><div class="card-details"><p>ID: <span>${product.id}</span></p><p>Category: <span>${product.category}</span></p><p>Stock: <span class="${stockClass}">${product.stock}</span></p></div></div>
                <div class="card-footer"><div class="status-toggle"><label class="switch"><input type="checkbox" ${isChecked} data-product-id="${product.id}"><span class="slider"></span></label></div><div class="action-icons"><a href="#" class="edit" title="Edit"><i class="fas fa-edit"></i></a><a href="#" class="delete" title="Delete"><i class="fas fa-trash-alt"></i></a></div></div>
            `;
            productGrid.appendChild(card);
        });
        addCardActionListeners();
    }
    
    function addCardActionListeners() {
        const cards = productGrid.querySelectorAll('.product-card-admin');
        cards.forEach(card => {
            const editButton = card.querySelector('.edit');
            const deleteButton = card.querySelector('.delete');
            const toggle = card.querySelector('.status-toggle input');
            const productId = card.dataset.productId;

            deleteButton.addEventListener('click', async (event) => {
                event.preventDefault(); event.stopPropagation();
                if (confirm(`Are you sure you want to delete product ID: ${productId}?`)) {
                    try {
                        const response = await fetch(`https://softstep-web.onrender.com/api/products/${productId}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('Failed to delete product.');
                        await loadProducts();
                    } catch (error) {
                        console.error('Error deleting product:', error); alert('Error deleting product. Please try again.');
                    }
                }
            });
            editButton.addEventListener('click', (event) => {
                event.preventDefault(); event.stopPropagation(); openModalForEdit(productId);
            });
            toggle.addEventListener('change', async (event) => {
                const newStatus = event.target.checked;
                try {
                    const response = await fetch(`https://softstep-web.onrender.com/api/products/${productId}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isActive: newStatus }),
                    });
                    if (!response.ok) throw new Error('Failed to update status.');
                    const product = products.find(p => p.id === productId);
                    if (product) product.isActive = newStatus;
                } catch (error) {
                    console.error('Error updating status:', error); alert('Failed to update status.'); event.target.checked = !newStatus;
                }
            });
        });
    }

    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append('id', document.getElementById('productId').value);
        formData.append('name', document.getElementById('productName').value);
        formData.append('category', document.getElementById('productCategory').value);
        formData.append('type', document.getElementById('productType').value);
        formData.append('stock', document.getElementById('productStock').value);
        if (productImageInput.files.length > 0) formData.append('productImage', productImageInput.files[0]);
        try {
            let response; let url = 'https://softstep-web.onrender.com/api/products'; let method = 'POST';
            if (currentEditId) {
                url = `https://softstep-web.onrender.com/api/products/${currentEditId}`; method = 'PUT';
            }
            response = await fetch(url, { method: method, body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${method === 'POST' ? 'add' : 'update'} product.`);
            }
            alert(`Product ${method === 'POST' ? 'added' : 'updated'} successfully!`);
        } catch (error) {
            console.error('Error saving product:', error); alert(`Error: ${error.message}`);
        }
        await loadProducts();
        closeModal();
    });

    function populateCategoryFilter() {
        const currentCategory = filterCategorySelect.value;
        filterCategorySelect.innerHTML = '<option value="">All</option>';
        const categories = [...new Set(products.map(p => p.category))];
        categories.sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category; option.textContent = category;
            filterCategorySelect.appendChild(option);
        });
        filterCategorySelect.value = currentCategory;
    }

    function applyFiltersAndDisplay() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = filterCategorySelect.value;
        const selectedStatus = filterStatusSelect.value;
        let filteredProducts = products.filter(product => {
            const matchesSearch = (product.name.toLowerCase().includes(searchTerm) || product.id.toLowerCase().includes(searchTerm) || product.category.toLowerCase().includes(searchTerm));
            const matchesCategory = !selectedCategory || product.category === selectedCategory;
            const matchesStatus = !selectedStatus || String(product.isActive) === selectedStatus;
            return matchesSearch && matchesCategory && matchesStatus;
        });
        displayAdminProducts(filteredProducts);
    }
    
    addNewProductBtn.addEventListener('click', openModalForAdd);
    closeModalButton.addEventListener('click', closeModal);
    advancedFilterBtn.addEventListener('click', () => advancedFiltersContainer.classList.toggle('hidden'));
    searchInput.addEventListener('input', applyFiltersAndDisplay);
    filterCategorySelect.addEventListener('change', applyFiltersAndDisplay);
    filterStatusSelect.addEventListener('change', applyFiltersAndDisplay);
    productImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            imagePreview.src = URL.createObjectURL(file);
            imagePreview.classList.add('show');
        } else {
            image.src = '#';
            imagePreview.classList.remove('show');
        }
    });
    
    if (sidebar && contentWrapper && sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            contentWrapper.classList.toggle('full-width');
        });
    }
    
    loadProducts();
    updateOrderBadge();

    // --- VVV ส่วนที่แก้ไข: เปลี่ยนมาใช้ Socket.IO VVV ---
    const socket = io("https://softstep-web.onrender.comm");

    socket.on("new_order_notification", (data) => {
        console.log("Real-time notification received!", data);
        if (orderBadge) {
            if (data.count > 0) {
                // เล่นเสียงเฉพาะเมื่อจำนวนออเดอร์เพิ่มขึ้น
                if (data.count > parseInt(orderBadge.textContent) || orderBadge.classList.contains('hidden')) {
                     const notificationSound = new Audio('../sounds/notification.mp3');
                     notificationSound.play().catch(e => console.error("Error playing sound:", e));
                }
                orderBadge.textContent = data.count;
                orderBadge.classList.remove('hidden');
            } else {
                orderBadge.textContent = '0';
                orderBadge.classList.add('hidden');
            }
        }
    });
});
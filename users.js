document.addEventListener('DOMContentLoaded', () => {

    // --- Sidebar Logic ---
    const sidebar = document.getElementById('sidebar');
    const contentWrapper = document.getElementById('content-wrapper');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    if (sidebar && contentWrapper && sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            contentWrapper.classList.toggle('full-width');
        });
    }

    // --- Order Badge & Sound Logic ---
    const orderBadge = document.getElementById('order-badge');
    const socket = io("https://softstep-backend.onrender.com"); // <-- อย่าลืมเปลี่ยนเป็น URL ของคุณ
    let previousOrderCount = 0;

    socket.on("new_order_notification", (data) => {
        if (orderBadge) {
            if (data.count > previousOrderCount) {
                const notificationSound = new Audio('../sounds/notification.mp3');
                notificationSound.play().catch(e => console.error("Error playing sound:", e));
            }
            previousOrderCount = data.count;
            
            if (data.count > 0) {
                orderBadge.textContent = data.count;
                orderBadge.classList.remove('hidden');
            } else {
                orderBadge.classList.add('hidden');
            }
        }
    });

    async function updateOrderBadge() {
        try {
            const response = await fetch('https://softstep-backend.onrender.com/api/orders/pending-count'); // <-- อย่าลืมเปลี่ยนเป็น URL ของคุณ
            const data = await response.json();
            previousOrderCount = data.count; // Set initial count
            if (orderBadge && data.count > 0) {
                orderBadge.textContent = data.count;
                orderBadge.classList.remove('hidden');
            }
        } catch (error) { console.error('Failed to update order badge:', error); }
    }


    // --- User Management Logic ---
    const userListBody = document.getElementById('user-list-body');
    const addUserForm = document.getElementById('add-user-form');
    const API_BASE_URL = 'https://softstep-backend.onrender.com'; // <-- อย่าลืมเปลี่ยนเป็น URL ของคุณ

    async function loadUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`);
            if (!response.ok) throw new Error('Failed to fetch users');
            const users = await response.json();
            displayUsers(users);
        } catch (error) {
            console.error('Error:', error);
            userListBody.innerHTML = `<tr><td colspan="3" style="color: red;">Error loading users.</td></tr>`;
        }
    }

    function displayUsers(users) {
        userListBody.innerHTML = '';
        users.forEach(user => {
            const row = userListBody.insertRow();
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td class="action-icons">
                    <a href="#" class="delete-user" data-user-id="${user.id}"><i class="fas fa-trash-alt"></i></a>
                </td>
            `;
        });
        addUserActionListeners();
    }
    
    function addUserActionListeners() {
        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                const userId = event.currentTarget.dataset.userId;
                if (confirm(`Are you sure you want to delete user ID: ${userId}?`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('Failed to delete user.');
                        await loadUsers();
                    } catch (error) {
                        alert('Error deleting user.');
                    }
                }
            });
        });
    }

    addUserForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to add user');
            }
            alert('User added successfully!');
            addUserForm.reset();
            await loadUsers();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // --- Initial Load ---
    loadUsers();
    updateOrderBadge();
});
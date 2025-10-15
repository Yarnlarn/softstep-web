document.addEventListener('DOMContentLoaded', () => {
    // --- VVV เพิ่ม "ยามเฝ้าประตู" VVV ---
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'admin') {
        alert('Access Denied! Only admins can manage users.');
        window.location.href = 'index.html';
        return;
    }

    // --- Sidebar & General Elements ---
    const sidebar = document.getElementById('sidebar');
    const contentWrapper = document.getElementById('content-wrapper');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');

    // --- User Management Elements ---
    const userListBody = document.getElementById('user-list-body');
    const addUserForm = document.getElementById('add-user-form');

    // --- Edit User Modal Elements ---
    const editUserModal = document.getElementById('editUserModal');
    const editForm = document.getElementById('edit-user-form');
    const editUsernameSpan = document.getElementById('edit-username');
    const editPasswordInput = document.getElementById('edit-password');
    const editRoleSelect = document.getElementById('edit-role');
    const editModalCloseBtn = editUserModal.querySelector('.close-button');

    // --- State Variables ---
    let currentEditUserId = null;
    let users = []; // Cache for user data

    // !!! IMPORTANT: Use your actual Render backend URL here
    const API_BASE_URL = 'https://softstep-backend.onrender.com';

    // --- Sidebar Logic ---
    if (sidebar && contentWrapper && sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            contentWrapper.classList.toggle('full-width');
        });
    }

    // --- Modal Control Functions ---
    const openEditModal = (userId) => {
        const user = users.find(u => u.id == userId);
        if (!user) return;

        currentEditUserId = userId;
        editUsernameSpan.textContent = user.username;
        editForm.reset(); // เคลียร์ช่องรหัสผ่านเก่า
        
        // --- VVV จุดที่แก้ไข VVV ---
        // ตั้งค่า dropdown ให้ตรงกับ role ปัจจุบันของผู้ใช้
        editRoleSelect.value = user.role; 

        editUserModal.classList.add('show');
    };
    const closeEditModal = () => editUserModal.classList.remove('show');

    // --- Data Fetching and Displaying ---
    async function loadUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`);
            if (!response.ok) throw new Error('Failed to fetch users');
            users = await response.json();
            displayUsers(users);
        } catch (error) {
            console.error('Error:', error);
            userListBody.innerHTML = `<tr><td colspan="4" style="color: red;">Error loading users.</td></tr>`;
        }
    }

    function displayUsers(userList) {
        userListBody.innerHTML = '';
        userList.forEach(user => {
            const row = userListBody.insertRow();
            // --- VVV จุดที่แก้ไข VVV ---
            // เพิ่ม <td> สำหรับแสดง role
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td class="action-icons">
                    <a href="#" class="edit-user" data-user-id="${user.id}"><i class="fas fa-edit"></i></a>
                    <a href="#" class="delete-user" data-user-id="${user.id}"><i class="fas fa-trash-alt"></i></a>
                </td>
            `;
        });
        addUserActionListeners();
    }
    
    // --- Event Listener Setup ---
    function addUserActionListeners() {
        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const userId = event.currentTarget.dataset.userId;
                deleteUser(userId);
            });
        });

        document.querySelectorAll('.edit-user').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const userId = event.currentTarget.dataset.userId;
                openEditModal(userId);
            });
        });
    }

    // --- API Interaction Functions ---
    async function addUser(username, password, role) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
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
    }

    async function deleteUser(userId) {
        if (!confirm(`Are you sure you want to delete user ID: ${userId}?`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete user.');
            await loadUsers();
        } catch (error) {
            alert('Error deleting user.');
        }
    }

    async function updateUser(userId, password, role) {
        const payload = { role };
        if (password) {
            payload.password = password;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Failed to update user');
            alert('User updated successfully!');
            closeEditModal();
            await loadUsers();
        } catch (error) {
            alert('Error updating user.');
        }
    }

    // --- Initial Event Bindings ---
    addUserForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const role = document.getElementById('new-role').value;
        addUser(username, password, role);
    });

    editForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const password = editPasswordInput.value;
        const role = editRoleSelect.value;
        updateUser(currentEditUserId, password, role);
    });
    
    editModalCloseBtn.addEventListener('click', closeEditModal);

    // --- Initial Load ---
    loadUsers();
});
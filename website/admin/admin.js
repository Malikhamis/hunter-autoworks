/**
 * Admin Panel JavaScript
 * Features:
 * - Service Management (CRUD)
 * - Analytics & Reports
 * - Invoice Generator
 * - Responsive UI Enhancements
 */

// --- Backend API Integration ---
// Backend API Integration - Auto-detect environment
// Define API_BASE on window to avoid redeclaration errors when scripts are included multiple times
window.API_BASE = window.API_BASE || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5001/api'
        : 'https://hunter-autoworks.onrender.com/api'
);
const API_BASE = window.API_BASE;
// Small fallback: mark the document as "page-ready" when admin scripts initialize.
// Primary visibility control is handled by the stylesheet link onload in each HTML head.
try{ document.documentElement.classList.add('page-ready'); }catch(e){/* noop */}
let jwtToken = localStorage.getItem('admin_jwt') || '';
let useLocalStorageMode = false; // Fallback mode when backend is unreachable

function setToken(token) {
    jwtToken = token;
    localStorage.setItem('admin_jwt', token);
}
function clearToken() {
    jwtToken = '';
    localStorage.removeItem('admin_jwt');
}
function getAuthHeaders() {
    return jwtToken ? { 'Authorization': 'Bearer ' + jwtToken } : {};
}

// --- Admin Authentication ---
async function adminLogin(username, password) {
    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Login failed');
        const data = await res.json();
        setToken(data.token);
        showSuccess('Login successful!');
        useLocalStorageMode = false;
        await loadServices();
        // After successful login, attempt to sync any locally stored documents
        try {
            await syncDocuments();
        } catch (e) {
            // syncDocuments already handles user-facing messages; just log here
            console.warn('Auto-sync after login failed or no network', e);
        }
        // Optionally reload page or hide login form
    } catch (e) {
        console.warn('Backend login failed, trying localStorage mode', e);
        // Fallback to localStorage-only mode (demo credentials)
        if (username === 'hunter' && password === 'hunter_admin1234') {
            setToken('local_mode_token');
            useLocalStorageMode = true;
            showSuccess('Login successful! (Local mode - no backend connection)');
            await loadServices();
        } else {
            showError('Invalid credentials. Use: hunter / hunter_admin1234');
        }
    }
}
function adminLogout() {
    clearToken();
    showSuccess('Logged out.');
    // Optionally reload page or show login form
}

// Expose adminLogin and adminLogout globally for HTML inline event handlers
window.adminLogin = adminLogin;
window.adminLogout = adminLogout;

// --- Login modal helpers ---
function showLoginModal() {
    const m = document.getElementById('loginModal');
    if (!m) return;
    m.style.display = 'flex';
    const user = document.getElementById('loginUser');
    const pass = document.getElementById('loginPass');
    if (user) user.value = '';
    if (pass) pass.value = '';
}
function hideLoginModal() {
    const m = document.getElementById('loginModal'); if (m) m.style.display = 'none';
}
window.showLoginModal = showLoginModal;

// Login form is handled in index.html

// --- Service CRUD via API ---
let services = [];

async function loadServices() {
    const serviceList = document.getElementById('serviceList') || document.getElementById('services-list');
    if (!serviceList) return;
    try {
        const res = await fetch(`${API_BASE}/services`);
        services = await res.json();
        serviceList.innerHTML = '';
        
        if (!services || !services.length) {
            serviceList.innerHTML = `
                <div style="grid-column:1/-1">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔧</div>
                        <h3 class="empty-state-title">No services yet</h3>
                        <p class="empty-state-description">Add services to start building invoices and estimates</p>
                        <button class="action-btn" onclick="document.getElementById('btn-new-service')?.click()">Add Service</button>
                    </div>
                </div>
            `;
            return services;
        }
        
        services.forEach((service, index) => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'card card-premium fade-in';
            serviceItem.style.animationDelay = `${index * 0.05}s`;
            
            // Service icons based on name
            const iconMap = {
                'oil': '🛢️', 'brake': '🔴', 'tire': '🛞', 'engine': '⚙️', 'battery': '🔋',
                'wash': '💦', 'paint': '🎨', 'repair': '🔧', 'diagnostic': '🔍', 'service': '🔧'
            };
            const serviceName = service.name.toLowerCase();
            let icon = '🔧';
            for (const [key, value] of Object.entries(iconMap)) {
                if (serviceName.includes(key)) { icon = value; break; }
            }
            
            serviceItem.innerHTML = `
                <div style="display:flex;align-items:start;gap:16px;margin-bottom:16px">
                    <div class="icon-container icon-container-warning" style="font-size:1.5rem">${icon}</div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:700;font-size:1.125rem;color:var(--text-primary);margin-bottom:4px">${escapeHtml(service.name)}</div>
                        <div style="font-size:1.5rem;font-weight:800;background:var(--gradient-success);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent">
                            TSh ${service.price.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--gray-200)">
                    <button class="action-btn" style="flex:1;font-size:0.8rem;padding:8px" onclick="editService(${index})">✏️ Edit</button>
                    <button class="logout-btn" style="flex:1;font-size:0.8rem;padding:8px" onclick="deleteService(${index})">🗑️ Delete</button>
                </div>
            `;
            serviceList.appendChild(serviceItem);
        });
        return services;
    } catch (e) {
        showError('Failed to load services from server.');
    }
}

// Populate a <select> element with current services. Useful for invoice item selection.
async function populateInvoiceServiceSelect(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    // Ensure services are loaded
    try {
        if (!services || !services.length) await loadServices();
    } catch (e) {
        // ignore - services fallback may exist elsewhere
    }
    const source = (services && services.length) ? services : DEFAULT_SERVICES;
    // If element is a select, populate options; otherwise populate a checkbox list container
    if (el.tagName.toLowerCase() === 'select') {
        el.innerHTML = '<option value="">Select service...</option>' + source.map(s => `<option value="${s._id || s.id || s.name}" data-price="${s.price || 0}">${escapeHtml(s.name)} — TSh ${ (s.price||0).toLocaleString() }</option>`).join('');
    } else {
        el.innerHTML = source.map(s => {
            const sid = (s._id || s.id || s.name + '-' + Math.random().toString(36).slice(2,7));
            const safeId = 'svc-' + sid.toString().replace(/[^a-zA-Z0-9-_]/g, '');
            return `<div class="svc"><input type="checkbox" id="${safeId}" data-sid="${escapeHtml(sid)}" data-price="${s.price||0}" /><label for="${safeId}">${escapeHtml(s.name)}</label><div class="svc-price">TSh ${(s.price||0).toLocaleString()}</div></div>`;
        }).join('');
        // wire checkbox change listeners to update selected subtotal
        setTimeout(() => {
            const list = document.getElementById(containerId);
            if (!list) return;
            list.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => { updateSelectedServicesTotal(); if (typeof updateInvoiceTotal === 'function') updateInvoiceTotal(); }));
            // initial update
            updateSelectedServicesTotal();
            if (typeof updateInvoiceTotal === 'function') updateInvoiceTotal();
        }, 50);
    }
}

window.populateInvoiceServiceSelect = populateInvoiceServiceSelect;

function updateInvoiceTotal() {
    const itemsDiv = document.getElementById('invoiceItems');
    if (!itemsDiv) return;
    const rows = Array.from(itemsDiv.querySelectorAll('div'));
    const total = rows.reduce((sum, row) => {
        const qEl = row.querySelector('.item-qty');
        const uEl = row.querySelector('.item-unit');
        const qty = qEl ? parseFloat(qEl.value || '0') : 0;
        const unit = uEl ? parseFloat(uEl.value || '0') : 0;
        return sum + (qty * unit);
    }, 0);
    // include selected services subtotal (services checked but not yet added)
    const selTotal = (typeof getSelectedServicesTotal === 'function') ? getSelectedServicesTotal() : 0;
    const combined = total + selTotal;
    const totalEl = document.getElementById('invoiceTotal');
    if (totalEl) totalEl.value = combined;
}

function attachItemRowListeners(row) {
    const q = row.querySelector('.item-qty');
    const u = row.querySelector('.item-unit');
    const rem = row.querySelector('.remove-item');
    if (q) q.addEventListener('input', updateInvoiceTotal);
    if (u) u.addEventListener('input', updateInvoiceTotal);
    if (rem) rem.addEventListener('click', () => { row.remove(); updateInvoiceTotal(); });
}

window.updateInvoiceTotal = updateInvoiceTotal;
window.attachItemRowListeners = attachItemRowListeners;

function updateSelectedServicesTotal() {
    const list = document.getElementById('invoiceServiceList');
    if (!list) return;
    const checked = Array.from(list.querySelectorAll('input[type=checkbox]:checked'));
    const total = checked.reduce((sum, cb) => sum + (parseInt(cb.getAttribute('data-price') || '0')), 0);
    const el = document.getElementById('selectedServicesTotal');
    if (el) el.textContent = `Selected: TSh ${total.toLocaleString()}`;
}
window.updateSelectedServicesTotal = updateSelectedServicesTotal;

function getSelectedServicesTotal() {
    const list = document.getElementById('invoiceServiceList');
    if (!list) return 0;
    const checked = Array.from(list.querySelectorAll('input[type=checkbox]:checked'));
    return checked.reduce((sum, cb) => sum + (parseInt(cb.getAttribute('data-price') || '0')), 0);
}
window.getSelectedServicesTotal = getSelectedServicesTotal;

// Local fallback services (matches public site fallback) used when backend is unreachable
const DEFAULT_SERVICES = [
    { name: 'Engine Diagnostics', price: 15000, icon: '🔍', desc: 'Computer diagnostics and analysis' },
    { name: 'Oil Change & Filter', price: 35000, icon: '🛢️', desc: 'Oil change with premium filter' },
    { name: 'Brake Service', price: 45000, icon: '🛑', desc: 'Brake pad replacement and inspection' },
    { name: 'Transmission Service', price: 80000, icon: '⚙️', desc: 'Transmission service and checks' },
    { name: 'AC Service', price: 25000, icon: '❄️', desc: 'AC re-gas and leak diagnostics' },
    { name: 'General Maintenance', price: 40000, icon: '🔧', desc: 'Multi-point maintenance service' }
];


async function addService() {
    const nameInput = document.getElementById('serviceName');
    const priceInput = document.getElementById('servicePrice');
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    if (!name || isNaN(price) || price <= 0) {
        showError('Please enter valid service name and price.');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, price })
        });
        if (!res.ok) throw new Error('Add failed');
        showSuccess('Service added successfully!');
        nameInput.value = '';
        priceInput.value = '';
        await loadServices();
    } catch (e) {
        showError('Failed to add service.');
    }
}

async function editService(index) {
    const service = services[index];
    renderCrudModal({
        title: 'Edit Service',
        fields: [
            { name: 'name', label: 'Service name', type: 'text', value: service.name },
            { name: 'price', label: 'Price (TSh)', type: 'number', value: service.price }
        ],
        onSave: async (values) => {
            const name = (values.name || '').trim();
            const price = parseFloat(values.price);
            if (!name || isNaN(price) || price <= 0) return showError('Invalid input.');
            try {
                const res = await fetch(`${API_BASE}/services/${service._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ name, price })
                });
                if (!res.ok) throw new Error('Update failed');
                showSuccess('Service updated successfully!');
                await loadServices();
            } catch (e) {
                showError('Failed to update service.');
            }
        }
    });
}

async function deleteService(index) {
    const service = services[index];
    renderConfirm({ title: 'Delete Service', message: `Are you sure you want to delete "${escapeHtml(service.name)}"?`, onConfirm: async () => {
        try {
            const res = await fetch(`${API_BASE}/services/${service._id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Delete failed');
            showSuccess('Service deleted successfully!');
            await loadServices();
        } catch (e) { showError('Failed to delete service.'); }
    }});
}

// --- Bookings CRUD via API ---
let bookings = [];

async function loadBookings() {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;
    try {
        const res = await fetch(`${API_BASE}/bookings`, { headers: getAuthHeaders() });
        bookings = await res.json();
        bookingsList.innerHTML = '';
        bookings.slice().reverse().forEach((booking, index) => {
            const item = document.createElement('div');
            item.className = 'booking-item';
            item.innerHTML = `
                <div class="booking-header">
                    <span class="booking-id">${booking._id || ''}</span>
                    <span class="booking-status status-${booking.status || 'pending'}">${booking.status || 'pending'}</span>
                </div>
                <div class="booking-details">
                    <strong>${booking.name}</strong> | ${booking.phone}<br>
                    <em>${booking.vehicle}</em><br>
                    <span>Service: ${booking.service}</span><br>
                    <span>Date: ${new Date(booking.createdAt).toLocaleString()}</span>
                </div>
            `;
            bookingsList.appendChild(item);
        });
    } catch (e) {
        showError('Failed to load bookings from server.');
    }
}

// --- Analytics/statistics via API ---
async function loadAnalytics() {
    try {
        if (!bookings.length) await loadBookings();
        // Stats
        document.getElementById('totalBookings').textContent = bookings.length;
        document.getElementById('pendingBookings').textContent = bookings.filter(b => b.status === 'pending').length;
        // Revenue calculations
        const today = new Date();
        let todayRevenue = 0, monthRevenue = 0;
        bookings.forEach(b => {
            const d = new Date(b.createdAt);
            if (d.toDateString() === today.toDateString()) {
                todayRevenue += b.price || 0;
            }
            if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
                monthRevenue += b.price || 0;
            }
        });
        document.getElementById('todayRevenue').textContent = 'TSh ' + todayRevenue.toLocaleString();
        document.getElementById('monthlyRevenue').textContent = 'TSh ' + monthRevenue.toLocaleString();
    } catch (e) {
        showError('Failed to load analytics.');
    }
}

// Data Backup/Restore/Clear Functions
function backupData() {
    try {
        const data = {
            services: JSON.parse(localStorage.getItem('services') || '[]'),
            bookings: JSON.parse(localStorage.getItem('bookings') || '[]')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hunter_autoworks_backup.json';
        a.click();
        showSuccess('Backup created and downloaded successfully!');
    } catch (e) {
        showError('Failed to create backup.');
    }
}

function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = JSON.parse(evt.target.result);
                if (data.services && data.bookings) {
                    localStorage.setItem('services', JSON.stringify(data.services));
                    localStorage.setItem('bookings', JSON.stringify(data.bookings));
                    showSuccess('Data restored! Reloading...');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showError('Invalid backup file.');
                }
            } catch {
                showError('Failed to restore data.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearData() {
    renderConfirm({ title: 'Clear All Data', message: 'Are you sure you want to clear all admin data? This cannot be undone.', onConfirm: async () => {
        localStorage.removeItem('services');
        localStorage.removeItem('bookings');
        showSuccess('All admin data cleared. Reloading...');
        setTimeout(() => location.reload(), 1000);
    }});
}

// Utility functions for messages
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// --- Modal helpers (reusable) ---
function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 200);
}

function renderCrudModal({ title = 'Form', fields = [], onSave }) {
    const modal = document.createElement('div');
    modal.className = 'crud-modal';
    const content = document.createElement('div');
    content.className = 'crud-content';
    content.innerHTML = `<h3>${title}</h3>`;
    const form = document.createElement('div');
    form.className = 'crud-form';

    fields.forEach(f => {
        const row = document.createElement('div');
        row.className = 'crud-row';
        const label = document.createElement('label'); label.textContent = f.label || f.name;
        let input = document.createElement('input');
        input.type = f.type || 'text';
        input.value = f.value || '';
        input.id = 'crud-' + f.name;
        row.appendChild(label);
        row.appendChild(input);
        form.appendChild(row);
    });

    const actions = document.createElement('div');
    actions.className = 'crud-actions';
    const btnCancel = document.createElement('button'); btnCancel.className = 'btn btn-cancel'; btnCancel.textContent = 'Cancel';
    const btnSave = document.createElement('button'); btnSave.className = 'btn btn-primary'; btnSave.textContent = 'Save';
    actions.appendChild(btnCancel); actions.appendChild(btnSave);

    content.appendChild(form); content.appendChild(actions); modal.appendChild(content); document.body.appendChild(modal);

    btnCancel.addEventListener('click', () => closeModal(modal));
    btnSave.addEventListener('click', async () => {
        const values = {};
        fields.forEach(f => {
            const el = document.getElementById('crud-' + f.name);
            values[f.name] = el ? el.value : '';
        });
        try {
            await onSave(values);
            closeModal(modal);
        } catch (e) {
            showError(e && e.message ? e.message : 'Save failed');
        }
    });
    return modal;
}

function renderConfirm({ title = 'Confirm', message = '', onConfirm }) {
    const modal = document.createElement('div');
    modal.className = 'crud-modal';
    const content = document.createElement('div'); content.className = 'crud-content';
    content.innerHTML = `<h3>${title}</h3><div style="margin-top:8px">${message}</div>`;
    const actions = document.createElement('div'); actions.className = 'crud-actions';
    const btnCancel = document.createElement('button'); btnCancel.className = 'btn btn-cancel'; btnCancel.textContent = 'Cancel';
    const btnYes = document.createElement('button'); btnYes.className = 'btn btn-primary'; btnYes.textContent = 'Yes';
    actions.appendChild(btnCancel); actions.appendChild(btnYes);
    content.appendChild(actions); modal.appendChild(content); document.body.appendChild(modal);
    btnCancel.addEventListener('click', () => closeModal(modal));
    btnYes.addEventListener('click', async () => { try { await onConfirm(); } catch (e) { showError(e && e.message ? e.message : 'Action failed'); } closeModal(modal); });
    return modal;
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    loadServices();

    const addBtn = document.getElementById('addServiceBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addService);
    }

    // Initialize invoice interface only if invoice elements exist on the page
    if (document.getElementById('invoiceBooking') || document.getElementById('serviceSelectionContainer') || document.getElementById('invoiceCustomer')) {
        try { loadInvoiceBookings(); } catch(e) { console.warn('loadInvoiceBookings skipped', e); }
        try { loadInvoiceServices(); } catch(e) { console.warn('loadInvoiceServices skipped', e); }
    }

    // Set today's date as default
    const dateInput = document.getElementById('invoiceDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Add event listener for customer input to update generate button
    const customerInput = document.getElementById('invoiceCustomer');
    if (customerInput) {
        customerInput.addEventListener('input', updateGenerateButton);
    }

    // Attach backup/restore/clear handlers
    const backupBtn = document.getElementById('backupDataBtn');
    const restoreBtn = document.getElementById('restoreDataBtn');
    const clearBtn = document.getElementById('clearDataBtn');
    if (backupBtn) backupBtn.addEventListener('click', backupData);
    if (restoreBtn) restoreBtn.addEventListener('click', restoreData);
    if (clearBtn) clearBtn.addEventListener('click', clearData);

    // Documents UI
    const docType = document.getElementById('docTypeSelect');
    if (docType) {
        docType.addEventListener('change', () => {
            // update UI labels if needed
        });
    }

    // Generate button enable/disable
    const genBtn = document.getElementById('generateInvoiceBtn');
    if (genBtn) genBtn.disabled = true;

    // Load saved documents list
    loadDocumentsList();
    // Initialize documents page wiring (documents.html or index documents grid)
    try { initDocumentsPage(); } catch(e) { /* ignore if not present on this page */ }
    // Initialize clients page if present
    try { if (typeof initClientsPage === 'function') initClientsPage(); } catch(e) {}
    // Start periodic background sync
    startBackgroundSync();
});

// -------------------
// Clients page: simple CRUD (uses API routes under /api/clients)
// -------------------
async function loadClients() {
    const container = document.getElementById('clients-list');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/clients`);
        const clients = await res.json();
        container.innerHTML = '';
        if (!clients.length) {
            container.innerHTML = `
                <div style="grid-column:1/-1">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <h3 class="empty-state-title">No clients yet</h3>
                        <p class="empty-state-description">Add your first client to start managing your customer relationships</p>
                        <button class="action-btn" onclick="document.getElementById('btn-new-client')?.click()">Add Client</button>
                    </div>
                </div>
            `;
            return;
        }
        clients.forEach((c, i) => {
            const el = document.createElement('div');
            el.className = 'card card-premium fade-in';
            el.style.animationDelay = `${i * 0.05}s`;
            
            // Generate avatar initials
            const initials = (c.name || 'N/A').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const colors = ['var(--gradient-primary)', 'var(--gradient-success)', 'var(--gradient-warning)', 'var(--gradient-purple)', 'var(--gradient-pink)'];
            const avatarBg = colors[i % colors.length];
            
            el.innerHTML = `
                <div style="display:flex;gap:16px;align-items:start">
                    <div style="width:56px;height:56px;border-radius:var(--radius-lg);background:${avatarBg};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.25rem;color:white;flex-shrink:0">
                        ${initials}
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:700;font-size:1.125rem;color:var(--text-primary);margin-bottom:4px">${escapeHtml(c.name || 'N/A')}</div>
                        <div style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;color:var(--text-muted)">
                            <div style="display:flex;align-items:center;gap:6px">
                                <span>📞</span>
                                <span>${escapeHtml(c.contact_phone || 'No phone')}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px">
                                <span>📧</span>
                                <span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.contact_email || 'No email')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-200)">
                    <button class="action-btn" style="flex:1;font-size:0.8rem;padding:8px" onclick="editClient('${c.id || c.id}')">✏️ Edit</button>
                    <button class="logout-btn" style="flex:1;font-size:0.8rem;padding:8px" onclick="deleteClient('${c.id || c.id}')">🗑️ Delete</button>
                </div>
            `;
            container.appendChild(el);
        });
    } catch (e) {
        showError('Failed to load clients.');
    }
}

function initClientsPage() {
    const newBtn = document.getElementById('btn-new-client');
    if (newBtn) newBtn.addEventListener('click', () => {
        openClientModal();
    });
    loadClients();
}

function openClientModal(existing) {
    renderCrudModal({
        title: existing ? 'Edit Client' : 'New Client',
        fields: [
            { name: 'name', label: 'Client name', type: 'text', value: existing ? existing.name : '' },
            { name: 'contact_phone', label: 'Contact phone', type: 'text', value: existing ? existing.contact_phone : '' },
            { name: 'contact_email', label: 'Contact email', type: 'email', value: existing ? existing.contact_email : '' }
        ],
        onSave: async (values) => {
            try {
                if (existing) {
                    const res = await fetch(`${API_BASE}/clients/${existing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(values) });
                    if (!res.ok) throw new Error('Update failed');
                    showSuccess('Client updated');
                } else {
                    const res = await fetch(`${API_BASE}/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(values) });
                    if (!res.ok) throw new Error('Create failed');
                    showSuccess('Client created');
                }
                loadClients();
            } catch (e) {
                showError(e.message || 'Save failed');
            }
        }
    });
}

async function editClient(id) {
    try {
        const res = await fetch(`${API_BASE}/clients/${id}`);
        if (!res.ok) throw new Error('Not found');
        const client = await res.json();
        openClientModal(client);
    } catch (e) { showError('Failed to load client'); }
}

async function deleteClient(id) {
    renderConfirm({ title: 'Delete Client', message: 'Delete this client?', onConfirm: async () => {
        try {
            const res = await fetch(`${API_BASE}/clients/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Delete failed');
            showSuccess('Client deleted');
            loadClients();
        } catch (e) { showError('Failed to delete client'); }
    }});
}

// small escape helper
function escapeHtml(s){ return String(s||'').replace(/[&<>"]+/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch)); }

// -------------------
// Documents page wiring & responsive editor
// -------------------
function initDocumentsPage() {
    // Render grid if present
    renderDocumentsGrid();

    // Wire new document button(s)
    const newDocBtn = document.getElementById('btn-new-doc') || document.getElementById('btn-new');
    if (newDocBtn) newDocBtn.addEventListener('click', () => openDocumentEditor());

    // Ensure index.html 'documents-list' also updates when documents change
    const listContainer = document.getElementById('documentsList') || document.getElementById('documents-list');
    if (listContainer) loadDocumentsList();
}

function renderDocumentsGrid() {
    const grid = document.getElementById('documents-grid');
    const docs = getDocuments().slice().reverse();
    if (!grid) return;
    if (!docs.length) {
        grid.innerHTML = '<div style="padding:18px;color:#64748b">No documents yet. Click New to create one.</div>';
        return;
    }

    grid.innerHTML = docs.map(doc => {
        const when = new Date(doc.date || doc.createdAt || Date.now()).toLocaleDateString();
        const typeLabel = (doc.type || 'invoice').toUpperCase();
        const total = (doc.services || []).reduce((s,i)=>s+(i.price||i.amount||0),0);
        return `
            <article class="card" style="padding:14px;border-radius:10px;background:#fff;box-shadow:0 6px 18px rgba(2,6,23,0.06);display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <div style="font-weight:800">${typeLabel} • ${doc.id}</div>
                        <div style="font-size:0.9rem;color:#64748b">${doc.customer} • ${when}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:800">TSh ${Number(total).toLocaleString()}</div>
                        <div style="font-size:0.85rem;color:#94a3b8;margin-top:4px">${doc.synced? 'Synced' : 'Local'}</div>
                    </div>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px">
                    <button onclick="viewDocument('${doc.id}')">View</button>
                    <button onclick="openDocumentEditor('${doc.id}')">Edit</button>
                    <button onclick="exportDocumentHTML('${doc.id}')">Export</button>
                </div>
            </article>
        `;
    }).join('\n');
}

// Create and open a responsive document editor modal. If `docId` provided, load for edit.
function openDocumentEditor(docId) {
    const existing = docId ? getDocuments().find(d => d.id === docId) : null;

    // Modal root
    const modal = document.createElement('div');
    modal.className = 'doc-editor-modal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.backdropFilter = 'blur(4px)';

    modal.innerHTML = `
        <div style="width:96%;max-width:880px;background:#fff;border-radius:12px;padding:18px;box-shadow:0 20px 60px rgba(2,6,23,0.15);max-height:92vh;overflow:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px">
                <h3 style="margin:0">${existing ? 'Edit' : 'New'} Document</h3>
                <div style="display:flex;gap:8px">
                    <button id="editorCancel">Cancel</button>
                    <button id="editorSave" style="background:var(--primary);color:#fff;padding:8px 12px;border-radius:8px;border:none">Save</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 240px;gap:12px;align-items:start">
                <div>
                    <label>Type</label>
                    <select id="editorDocType" style="width:100%;padding:8px;margin-top:6px">
                        <option value="estimate">Estimate</option>
                        <option value="quote">Quotation</option>
                        <option value="proforma">Proforma</option>
                        <option value="invoice">Invoice</option>
                    </select>

                    <label style="margin-top:8px;display:block">Customer</label>
                    <input id="editorCustomer" placeholder="Customer name" style="width:100%;padding:8px;margin-top:6px" />

                    <label style="margin-top:8px;display:block">Date</label>
                    <input id="editorDate" type="date" style="width:100%;padding:8px;margin-top:6px" />

                    <div style="margin-top:12px">
                        <div style="font-weight:700;margin-bottom:8px">Select Services</div>
                        <div id="editorServices" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px"></div>
                    </div>

                    <div style="margin-top:12px">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <div style="font-weight:700">Custom Line Items</div>
                            <button id="editorAddCustom">Add</button>
                        </div>
                        <div id="editorCustomItems" style="margin-top:8px;display:flex;flex-direction:column;gap:8px"></div>
                    </div>
                </div>

                <aside style="background:#f8fafc;padding:12px;border-radius:8px">
                    <div style="font-weight:700;margin-bottom:8px">Summary</div>
                    <div style="display:flex;justify-content:space-between"><div>Subtotal</div><div id="editorSubtotal">TSh 0</div></div>
                    <div style="display:flex;justify-content:space-between;margin-top:6px"><div>Tax</div><div id="editorTax">TSh 0</div></div>
                    <div style="display:flex;justify-content:space-between;margin-top:10px;font-weight:800"><div>Total</div><div id="editorTotal">TSh 0</div></div>
                </aside>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Populate services
    const svcContainer = modal.querySelector('#editorServices');
    services.forEach((s, idx) => {
        const el = document.createElement('label');
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '8px';
        el.style.padding = '8px';
        el.style.border = '1px solid #eef2f7';
        el.style.borderRadius = '8px';
        el.innerHTML = `<input type="checkbox" data-idx="${idx}" /> <div style="flex:1"><div style="font-weight:700">${s.name}</div><div style="font-size:0.85rem;color:#64748b">TSh ${Number(s.price||s.unit_price_tsh||0).toLocaleString()}</div></div>`;
        svcContainer.appendChild(el);
    });

    // helpers for editor state
    function computeEditorTotals() {
        let subtotal = 0;
        // services
        const checked = modal.querySelectorAll('#editorServices input[type=checkbox]:checked');
        checked.forEach(ch => {
            const idx = Number(ch.getAttribute('data-idx'));
            const s = services[idx];
            subtotal += Number(s.price || s.unit_price_tsh || 0);
        });
        // custom items
        const customs = modal.querySelectorAll('.editor-custom-item');
        customs.forEach(c => {
            const amt = Number(c.querySelector('.custom-amount').value || 0);
            subtotal += amt;
        });
        const tax = 0; // placeholder for tax logic
        const total = subtotal + tax;
        modal.querySelector('#editorSubtotal').textContent = 'TSh ' + subtotal.toLocaleString();
        modal.querySelector('#editorTax').textContent = 'TSh ' + tax.toLocaleString();
        modal.querySelector('#editorTotal').textContent = 'TSh ' + total.toLocaleString();
        return { subtotal, tax, total };
    }

    // add custom item handler
    modal.querySelector('#editorAddCustom').addEventListener('click', () => {
        const wrap = document.createElement('div');
        wrap.className = 'editor-custom-item';
        wrap.style.display = 'flex';
        wrap.style.gap = '8px';
        wrap.innerHTML = `<input class="custom-desc" placeholder="Description" style="flex:1;padding:6px" /><input class="custom-amount" type="number" placeholder="Amount" style="width:120px;padding:6px" /><button class="custom-remove">Remove</button>`;
        modal.querySelector('#editorCustomItems').appendChild(wrap);
        wrap.querySelector('.custom-remove').addEventListener('click', () => { wrap.remove(); computeEditorTotals(); });
        wrap.querySelector('.custom-amount').addEventListener('input', computeEditorTotals);
    });

    // recompute totals when service checkboxes change
    modal.querySelectorAll('#editorServices input[type=checkbox]').forEach(ch => ch.addEventListener('change', computeEditorTotals));

    // prefill if editing
    if (existing) {
        modal.querySelector('#editorDocType').value = existing.type || 'invoice';
        modal.querySelector('#editorCustomer').value = existing.customer || '';
        modal.querySelector('#editorDate').value = (existing.date || existing.createdAt || '').slice(0,10) || new Date().toISOString().slice(0,10);
        // check services that match by name
        const svcInputs = modal.querySelectorAll('#editorServices input[type=checkbox]');
        svcInputs.forEach(inp => {
            const idx = Number(inp.getAttribute('data-idx'));
            const s = services[idx];
            if ((existing.services || []).find(es => es.name === s.name)) inp.checked = true;
        });
        // custom items
        (existing.custom_items || []).forEach(ci => {
            modal.querySelector('#editorAddCustom').click();
            const last = modal.querySelector('#editorCustomItems .editor-custom-item:last-child');
            last.querySelector('.custom-desc').value = ci.desc || '';
            last.querySelector('.custom-amount').value = ci.amount || 0;
        });
        computeEditorTotals();
    } else {
        // default date
        modal.querySelector('#editorDate').value = new Date().toISOString().slice(0,10);
    }

    // Cancel handler
    modal.querySelector('#editorCancel').addEventListener('click', () => { modal.remove(); });

    // Save handler
    modal.querySelector('#editorSave').addEventListener('click', () => {
        const type = modal.querySelector('#editorDocType').value;
        const customer = modal.querySelector('#editorCustomer').value.trim();
        const date = modal.querySelector('#editorDate').value;
        if (!customer) return showError('Please enter customer name');

        // collect services
        const chosen = [];
        modal.querySelectorAll('#editorServices input[type=checkbox]:checked').forEach(ch => {
            const idx = Number(ch.getAttribute('data-idx'));
            const s = services[idx];
            chosen.push({ name: s.name, price: Number(s.price || s.unit_price_tsh || 0) });
        });
        // collect custom items
        const customList = [];
        modal.querySelectorAll('.editor-custom-item').forEach(c => {
            customList.push({ desc: c.querySelector('.custom-desc').value.trim(), amount: Number(c.querySelector('.custom-amount').value || 0) });
        });

        const combinedServices = chosen.concat(customList.filter(c => c.amount && c.desc).map(c => ({ name: c.desc, price: c.amount })));

        const id = existing ? existing.id : `${type.slice(0,3).toUpperCase()}-${Date.now()}`;
        const docObj = {
            id,
            type,
            bookingId: existing ? existing.bookingId : null,
            customer,
            date,
            services: combinedServices,
            custom_items: customList,
            html: generateDocumentHTML({ id, type, bookingId: existing ? existing.bookingId : null, customer, date, services: combinedServices }),
            createdAt: existing ? existing.createdAt : new Date().toISOString(),
            synced: false
        };

        if (existing) {
            // replace local doc with updated
            const docs = getDocuments();
            const idx = docs.findIndex(d => d.id === existing.id);
            if (idx !== -1) { docs[idx] = { ...docs[idx], ...docObj }; saveDocuments(docs); }
            else addDocument(docObj);
        } else {
            addDocument(docObj);
        }

        // refresh UI
        renderDocumentsGrid();
        loadDocumentsList();
        modal.remove();
        showSuccess('Document saved');
    });
}

// Expose editor open for global use (edit button calls it)
window.openDocumentEditor = openDocumentEditor;


let revenueChartInstance = null;
let bookingsChartInstance = null;

// Analytics Functions
function initializeCharts() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');

    // Calculate last 6 months labels and revenue
    const now = new Date();
    const months = [];
    const revenueData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short' });
        months.push(label);
        // Sum revenue for this month
        const monthRevenue = bookings
            .filter(b => {
                const date = new Date(b.date || b.createdAt || b.bookingDate || 0);
                return date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear();
            })
            .reduce((sum, b) => sum + (b.service ? b.service.price : 0), 0);
        revenueData.push(monthRevenue);
    }

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }
    revenueChartInstance = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Revenue (TSh)',
                data: revenueData,
                borderColor: '#1e3c72',
                backgroundColor: 'rgba(30, 60, 114, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Bookings Chart
    const bookingsCtx = document.getElementById('bookingsChart').getContext('2d');
    if (bookingsChartInstance) {
        bookingsChartInstance.destroy();
    }
    bookingsChartInstance = new Chart(bookingsCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending', 'Confirmed'],
            datasets: [{
                data: [
                    bookings.filter(b => b.status === 'completed').length,
                    bookings.filter(b => b.status === 'pending').length,
                    bookings.filter(b => b.status === 'confirmed').length
                ],
                backgroundColor: ['#28a745', '#ffc107', '#007bff']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Export Functions
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Hunter Autoworks - Business Report', 20, 20);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.service ? b.service.price : 0), 0);
    doc.text(`Total Bookings: ${bookings.length}`, 20, 50);
    doc.text(`Total Revenue: TSh ${totalRevenue.toLocaleString()}`, 20, 60);
    doc.text(`Completed: ${bookings.filter(b => b.status === 'completed').length}`, 20, 70);
    doc.text(`Pending: ${bookings.filter(b => b.status === 'pending').length}`, 20, 80);
    doc.save('hunter_autoworks_report.pdf');
    showSuccess('PDF report exported successfully!');
}

function exportToExcel() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const ws = XLSX.utils.json_to_sheet(bookings);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    XLSX.writeFile(wb, 'hunter_autoworks_bookings.xlsx');
    showSuccess('Excel report exported successfully!');
}

function exportAnalytics() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const analytics = {
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((sum, b) => sum + (b.service ? b.service.price : 0), 0),
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        confirmedBookings: bookings.filter(b => b.status === 'confirmed').length
    };
    const dataStr = JSON.stringify(analytics, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hunter_autoworks_analytics.json';
    link.click();
    showSuccess('Analytics exported successfully!');
}

// Invoice Functions
let selectedServices = [];

function loadInvoiceBookings() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const select = document.getElementById('invoiceBooking');

    select.innerHTML = '<option value="">Select Existing Customer (Optional)</option>' +
        bookings.map(booking =>
            `<option value="${booking.bookingId}">${booking.firstName} ${booking.lastName} - ${booking.phone}</option>`
        ).join('');
}

function loadCustomerFromBooking() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const select = document.getElementById('invoiceBooking');
    const selectedBooking = bookings.find(b => b.bookingId === select.value);

    if (selectedBooking) {
        document.getElementById('invoiceCustomer').value = `${selectedBooking.firstName} ${selectedBooking.lastName}`;
    } else {
        document.getElementById('invoiceCustomer').value = '';
    }
}

function loadInvoiceServices() {
    const serviceContainer = document.getElementById('serviceSelectionContainer');

    serviceContainer.innerHTML = '';
    services.forEach((service, index) => {
        const serviceDiv = document.createElement('div');
        serviceDiv.className = 'service-checkbox';
        serviceDiv.innerHTML = `
            <input type="checkbox" id="service_${index}" value="${index}" onchange="toggleService(${index})">
            <div class="service-info">
                <span class="service-name">${service.name}</span>
                <span class="service-price">TSh ${service.price.toLocaleString()}</span>
            </div>
        `;
        serviceContainer.appendChild(serviceDiv);
    });
}

function toggleService(serviceIndex) {
    const checkbox = document.getElementById(`service_${serviceIndex}`);
    const service = services[serviceIndex];

    if (checkbox.checked) {
        // Add service to selected list
        if (!selectedServices.find(s => s.index === serviceIndex)) {
            selectedServices.push({
                index: serviceIndex,
                name: service.name,
                price: service.price
            });
        }
    } else {
        // Remove service from selected list
        selectedServices = selectedServices.filter(s => s.index !== serviceIndex);
    }

    updateSelectedServicesList();
    updateInvoiceTotal();
    updateGenerateButton();
}

function updateSelectedServicesList() {
    const listContainer = document.getElementById('selectedServicesList');

    if (selectedServices.length === 0) {
        listContainer.innerHTML = '<p class="no-services">No services selected</p>';
        return;
    }

    listContainer.innerHTML = selectedServices.map(service => `
        <div class="selected-service-item">
            <span>${service.name}</span>
            <span>TSh ${service.price.toLocaleString()}</span>
        </div>
    `).join('');
}

function updateInvoiceTotal() {
    const total = selectedServices.reduce((sum, service) => sum + service.price, 0);
    document.getElementById('invoiceTotal').textContent = total.toLocaleString();
}

function updateGenerateButton() {
    const customer = document.getElementById('invoiceCustomer').value.trim();
    const hasServices = selectedServices.length > 0;
    const generateBtn = document.getElementById('generateInvoiceBtn');

    generateBtn.disabled = !customer || !hasServices;
}

function generateInvoice() {
    const bookingId = document.getElementById('invoiceBooking').value;
    const customer = document.getElementById('invoiceCustomer').value.trim();
    const date = document.getElementById('invoiceDate').value;

    // Validation
    if (!customer) {
        showError('Please enter customer name.');
        return;
    }

    if (selectedServices.length === 0) {
        showError('Please select at least one service.');
        return;
    }

    if (!date) {
        showError('Please select invoice date.');
        return;
    }

    // Calculate total
    const totalAmount = selectedServices.reduce((sum, service) => sum + service.price, 0);

    // Generate invoice ID
    const invoiceId = bookingId || `INV-${Date.now()}`;

    // Generate service rows for the table
    const serviceRows = selectedServices.map(service => `
        <tr>
            <td style="padding: 12px; border: 1px solid #ddd;">${service.name}</td>
            <td style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">TSh ${service.price.toLocaleString()}</td>
        </tr>
    `).join('');

    const invoicePreview = document.getElementById('invoicePreview');
    invoicePreview.style.display = 'block';
    invoicePreview.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; border: 2px solid #1e3c72; border-radius: 10px; background: white;">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e3c72;">
                <img src="../images/logo.jpg" alt="Hunter Autoworks Logo" style="height: 50px; margin-bottom: 10px;" />
                <h1 style="color: #1e3c72; margin: 0; font-size: 2rem; font-weight: bold;">HUNTER AUTOWORKS</h1>
                <p style="color: #666; margin: 5px 0; font-style: italic;">Professional Automotive Services</p>
                <p style="color: #666; margin: 0; font-size: 0.9rem;">Dar es Salaam, Tanzania | Tel: +255 627 629 345</p>
            </div>

            <!-- Invoice Details -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; flex-wrap: wrap;">
                <div>
                    <h2 style="color: #1e3c72; margin: 0 0 10px 0; font-size: 1.5rem;">INVOICE</h2>
                    <p style="margin: 5px 0;"><strong>Invoice ID:</strong> ${invoiceId}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                    ${bookingId ? `<p style="margin: 5px 0;"><strong>Booking Ref:</strong> ${bookingId}</p>` : ''}
                </div>
                <div style="text-align: right;">
                    <h3 style="color: #1e3c72; margin: 0 0 10px 0;">Bill To:</h3>
                    <p style="margin: 5px 0; font-weight: bold; font-size: 1.1rem;">${customer}</p>
                </div>
            </div>

            <!-- Service Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #ddd;">
                <thead>
                    <tr style="background: #1e3c72; color: white;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Service Description</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${serviceRows}
                    ${selectedServices.length > 1 ? `
                    <tr style="background: #f8f9fa; font-weight: bold;">
                        <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">TOTAL:</td>
                        <td style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold; color: #1e3c72;">TSh ${totalAmount.toLocaleString()}</td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>

            <!-- Total Section -->
            <div style="text-align: right; margin-bottom: 30px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; display: inline-block; min-width: 200px;">
                    <p style="margin: 5px 0; font-size: 1.2rem;"><strong>Total Amount: TSh ${totalAmount.toLocaleString()}</strong></p>
                </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 2px solid #1e3c72; color: #666;">
                <p style="margin: 5px 0; font-style: italic;">Thank you for choosing Hunter Autoworks!</p>
                <p style="margin: 5px 0; font-size: 0.9rem;">Quality service you can trust • Professional automotive care</p>
                <div style="margin-top: 15px, font-size: 0.8rem;">
                    <span style="margin: 0 10px;">Web: www.hunterautoworks.com</span>
                    <span style="margin: 0 10px;">Email: info@hunterautoworks.com</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('downloadInvoiceBtn').style.display = 'inline-block';
    showSuccess('Invoice generated successfully!');
}

// -------------------
// Documents (Estimate/Quote/Proforma/Invoice)
// -------------------

function getDocuments() {
    return JSON.parse(localStorage.getItem('documents') || '[]');
}

function saveDocuments(docs) {
    localStorage.setItem('documents', JSON.stringify(docs));
}

function addDocument(doc) {
    // Try to save to server first, fall back to local storage on error
    saveDocumentToServer(doc).then(saved => {
        const docs = getDocuments();
        if (saved && saved.id) {
            docs.push({ ...doc, serverId: saved.id, synced: true, lastSyncedAt: new Date().toISOString() });
        } else {
            docs.push({ ...doc, synced: false });
        }
        saveDocuments(docs);
        loadDocumentsList();
    }).catch(() => {
        const docs = getDocuments();
        docs.push({ ...doc, synced: false });
        saveDocuments(docs);
        loadDocumentsList();
    });
}

function deleteDocument(id) {
    if (!confirm('Delete this document?')) return;
    // attempt server delete, then local
    deleteDocumentFromServer(id).finally(() => {
        let docs = getDocuments();
        docs = docs.filter(d => d.id !== id);
        saveDocuments(docs);
        loadDocumentsList();
        showSuccess('Document deleted');
    });
}

function loadDocumentsList() {
    const container = document.getElementById('documentsList');
    const docs = getDocuments().slice().reverse();
    if (!container) return;
    if (!docs.length) {
        container.innerHTML = '<p class="no-services">No documents yet.</p>';
        return;
    }

    container.innerHTML = docs.map(doc => {
        const syncedFlag = doc.synced ? '<span style="color:green;font-weight:700;margin-left:8px;">Synced</span>' : '<span style="color:#d97706;font-weight:700;margin-left:8px;">Unsynced</span>';
        const lastSynced = doc.lastSyncedAt ? `<div style="color:#94a3b8;font-size:0.85rem;margin-top:4px;">Last synced: ${new Date(doc.lastSyncedAt).toLocaleString()}</div>` : '';
        return `
        <div class="service-item" style="display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-weight:700">${doc.type.toUpperCase()} - ${doc.id} ${syncedFlag}</div>
                <div style="color:#64748b;font-size:0.9rem">${doc.customer} • ${new Date(doc.date).toLocaleDateString()}</div>
                ${lastSynced}
            </div>
            <div style="display:flex;gap:0.5rem;">
                <button class="action-btn" onclick="viewDocument('${doc.id}')">View</button>
                <button class="action-btn" onclick="downloadDocument('${doc.id}')">PDF</button>
                <button class="action-btn" onclick="exportDocumentHTML('${doc.id}')">Export HTML</button>
                <button class="action-btn" onclick="shareDocument('${doc.id}')">Share</button>
                <button class="action-btn cancel" onclick="deleteDocument('${doc.id}')">Delete</button>
            </div>
        </div>
    `}).join('');
}

// --- Server-first helpers for documents ---
async function fetchDocumentsFromServer() {
    try {
        const res = await fetch(`${API_BASE}/documents`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    } catch (e) {
        console.warn('Server fetch documents failed, falling back to local', e);
        throw e;
    }
}

async function saveDocumentToServer(doc) {
    try {
        const res = await fetch(`${API_BASE}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(doc)
        });
        if (!res.ok) throw new Error('Save failed');
        return await res.json();
    } catch (e) {
        console.warn('Save to server failed', e);
        throw e;
    }
}

async function deleteDocumentFromServer(id) {
    try {
        // server expects a numeric id or doc id; try both patterns
        const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Delete failed');
        return await res.json();
    } catch (e) {
        console.warn('Server delete failed', e);
        // don't block local delete
    }
}

async function syncDocuments() {
    const docs = getDocuments();
    const unsynced = docs.filter(d => !d.synced);
    if (!unsynced.length) return showSuccess('All documents already synced');

    let anySynced = 0;
    const syncedIds = [];
    for (const doc of unsynced) {
        try {
            const saved = await saveDocumentToServer(doc);
            doc.synced = true;
            doc.serverId = saved && saved.id ? saved.id : doc.serverId;
            doc.lastSyncedAt = new Date().toISOString();
            anySynced++;
            syncedIds.push(doc.id || doc.doc_id || doc.serverId);
        } catch (e) {
            // keep unsynced
        }
    }
    saveDocuments(docs);
    loadDocumentsList();
    if (anySynced) {
        showSuccess(`${anySynced} documents synced to server`);
        // small toast with ids
        console.log('Synced docs:', syncedIds);
    } else showError('No documents could be synced (server unreachable or auth failed)');
}

// expose sync to global
window.syncDocuments = syncDocuments;

// --- Background sync scheduler ---
let _bgSyncIntervalMs = 60000; // default 60s
let _bgSyncTimer = null;
let _bgSyncFailures = 0;

function setSyncUIRunning(running) {
    const spinner = document.getElementById('syncSpinner');
    const text = document.getElementById('syncText');
    if (!spinner || !text) return;
    if (running) {
        spinner.style.display = 'inline-block';
        text.textContent = 'Syncing...';
    } else {
        spinner.style.display = 'none';
        text.textContent = 'Idle';
    }
}

async function runBackgroundSync() {
    try {
        setSyncUIRunning(true);
        await syncDocuments();
        _bgSyncFailures = 0;
        // reset interval to default after successful sync
        _bgSyncIntervalMs = 60000;
    } catch (e) {
        _bgSyncFailures++;
        // exponential backoff capped at 5 minutes
        _bgSyncIntervalMs = Math.min(300000, 60000 * Math.pow(2, Math.min(6, _bgSyncFailures)));
    } finally {
        setSyncUIRunning(false);
        scheduleNextBackgroundSync();
    }
}

function scheduleNextBackgroundSync() {
    if (_bgSyncTimer) clearTimeout(_bgSyncTimer);
    _bgSyncTimer = setTimeout(() => {
        runBackgroundSync();
    }, _bgSyncIntervalMs);
}

function startBackgroundSync() {
    // only start if window has a sync button (documents UI present)
    if (!document.getElementById('syncBtnHeader')) return;
    if (_bgSyncTimer) return; // already running
    // do an immediate run in background (non-blocking)
    runBackgroundSync().catch(() => {});
}

function stopBackgroundSync() {
    if (_bgSyncTimer) clearTimeout(_bgSyncTimer);
    _bgSyncTimer = null;
}

window.startBackgroundSync = startBackgroundSync;
window.stopBackgroundSync = stopBackgroundSync;

function viewDocument(id) {
    const docs = getDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return showError('Document not found');
    // Populate preview using the same structure as generateInvoice but with doc data
    selectedServices = doc.services.map(s => ({ name: s.name, price: s.price }));
    document.getElementById('invoiceCustomer').value = doc.customer;
    document.getElementById('invoiceDate').value = doc.date;
    updateSelectedServicesList();
    updateInvoiceTotal();
    updateGenerateButton();
    // Render preview
    const prev = document.getElementById('invoicePreview');
    prev.style.display = 'block';
    prev.innerHTML = doc.html || '<p>No preview available</p>';
    document.getElementById('downloadInvoiceBtn').style.display = 'inline-block';
}

function downloadDocument(id) {
    const docs = getDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return showError('Document not found');
    // Render preview into invoicePreview then call downloadInvoice which uses jsPDF
    const prev = document.getElementById('invoicePreview');
    prev.style.display = 'block';
    prev.innerHTML = doc.html || '<p>No preview available</p>';
    // Temporarily set selectedServices/customer/date for downloadInvoice()
    selectedServices = doc.services.map(s => ({ name: s.name, price: s.price }));
    document.getElementById('invoiceCustomer').value = doc.customer;
    document.getElementById('invoiceDate').value = doc.date;
    downloadInvoice();
}

function generateDocument() {
    const type = document.getElementById('docTypeSelect').value;
    const bookingId = document.getElementById('invoiceBooking').value;
    const customer = document.getElementById('invoiceCustomer').value.trim();
    const date = document.getElementById('invoiceDate').value;

    // Validation reuse
    if (!customer) return showError('Please enter customer name.');
    if (selectedServices.length === 0) return showError('Please select at least one service.');
    if (!date) return showError('Please select date.');

    // Build doc object
    const id = `${type.slice(0,3).toUpperCase()}-${Date.now()}`;
    const servicesForSave = selectedServices.map(s => ({ name: s.name, price: s.price }));

    // Reuse invoice HTML generation but label according to type
    const prevHtml = generateDocumentHTML({ id, type, bookingId, customer, date, services: servicesForSave });

    const docObj = {
        id,
        type,
        bookingId,
        customer,
        date,
        services: servicesForSave,
        html: prevHtml,
        createdAt: new Date().toISOString()
    };

    addDocument(docObj);
    // Show preview
    const prev = document.getElementById('invoicePreview');
    prev.style.display = 'block';
    prev.innerHTML = prevHtml;
    document.getElementById('downloadInvoiceBtn').style.display = 'inline-block';
    showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully.`);
}

function generateDocumentHTML({ id, type, bookingId, customer, date, services }) {
    // Modern responsive template with embedded CSS for better styling and export fidelity
    const totalAmount = services.reduce((s, it) => s + it.price, 0);
    const serviceRows = services.map(service => `
        <tr class="line-item">
            <td class="desc">${service.name}</td>
            <td class="amount">TSh ${service.price.toLocaleString()}</td>
        </tr>
    `).join('');

    const title = type === 'invoice' ? 'INVOICE' : (type === 'estimate' ? 'ESTIMATE' : (type === 'quote' ? 'QUOTATION' : 'PROFORMA INVOICE'));

    const css = `
        :root{--primary:#1e3c72;--muted:#64748b;--accent:#06b6d4}
        body{font-family: Inter,system-ui,Segoe UI,Roboto,Arial; margin:0; background:#f3f4f6}
        .doc-wrap{max-width:800px;margin:24px auto;background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(16,24,40,0.08);overflow:hidden;border:1px solid rgba(30,60,114,0.06)}
        .doc-header{display:flex;align-items:center;justify-content:space-between;padding:28px;background:linear-gradient(90deg,var(--primary),#234a87);color:#fff}
        .doc-header .brand{display:flex;align-items:center;gap:12px}
        .brand img{height:44px;border-radius:6px}
        .brand h1{margin:0;font-size:20px;letter-spacing:0.08em}
        .doc-body{padding:28px}
        .meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
        .bill-to{font-weight:600;color:var(--muted)}
        table.items{width:100%;border-collapse:collapse;margin-top:8px}
        table.items thead th{background:var(--primary);color:#fff;text-align:left;padding:12px;border:0}
        table.items tbody td{padding:12px;border-bottom:1px solid #eef2f7}
        .line-item .desc{width:70%}
        .line-item .amount{text-align:right;font-weight:700}
        .total-row{display:flex;justify-content:flex-end;margin-top:18px}
        .total-box{background:#f8fafc;padding:12px 18px;border-radius:8px;border:1px solid rgba(30,60,114,0.06);font-weight:700;color:var(--primary)}
        .doc-footer{padding:20px 28px;background:#f8fafc;color:#6b7280;text-align:center;font-size:0.9rem}
    `;

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>${title} - ${id}</title>
            <style>${css}</style>
        </head>
        <body>
            <div class="doc-wrap">
                <div class="doc-header">
                    <div class="brand">
                        <img src="../images/logo.jpg" alt="logo" />
                        <div>
                            <div style="font-size:14px;opacity:0.95">HUNTER AUTOWORKS</div>
                            <div style="font-size:11px;opacity:0.9">Professional Automotive Services</div>
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:700;font-size:18px">${title}</div>
                        <div style="margin-top:6px;font-size:12px">ID: ${id}</div>
                        <div style="font-size:12px">Date: ${new Date(date).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="doc-body">
                    <div class="meta">
                        <div>
                            <div class="bill-to">Bill To</div>
                            <div style="font-weight:700;margin-top:6px">${customer}</div>
                        </div>
                        <div style="text-align:right">
                            ${bookingId ? `<div>Booking Ref: <strong>${bookingId}</strong></div>` : ''}
                        </div>
                    </div>

                    <table class="items">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align:right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${serviceRows}
                        </tbody>
                    </table>

                    <div class="total-row">
                        <div class="total-box">TOTAL: TSh ${totalAmount.toLocaleString()}</div>
                    </div>
                </div>
                <div class="doc-footer">Thank you for choosing Hunter Autoworks — Quality service you can trust.</div>
            </div>
        </body>
        </html>
    `;
}

function downloadInvoice() {
    const invoicePreview = document.getElementById('invoicePreview');
    if (!invoicePreview.innerHTML) {
        showError('Please generate an invoice first.');
        return;
    }

    // Prefer jsPDF html renderer for high-fidelity output
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        // Use the preview DOM if available; otherwise generate a modern HTML in a hidden iframe
        const sourceEl = invoicePreview;
        // jsPDF.html returns a Promise via callback
        doc.html(sourceEl, {
            callback: function (pdf) {
                const bookingId = document.getElementById('invoiceBooking')?.value || '';
                const invoiceId = bookingId || `INV-${Date.now()}`;
                pdf.save(`Hunter_Autoworks_Invoice_${invoiceId}.pdf`);
                showSuccess('Professional invoice downloaded successfully!');
            },
            x: 10,
            y: 10,
            html2canvas: { scale: 1, useCORS: true }
        });
        return;
    } catch (e) {
        console.warn('jsPDF.html failed, falling back to legacy print method', e);
    }

    // Fallback: export the generated HTML as an HTML file
    const htmlContent = invoicePreview.innerHTML;
    const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${htmlContent}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hunter_Autoworks_Invoice_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showSuccess('Invoice exported as HTML (fallback)');
}

// Export the document as a standalone HTML file with full template
function exportDocumentHTML(id) {
    const docs = getDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return showError('Document not found');
    const html = generateDocumentHTML({ id: doc.id, type: doc.type, bookingId: doc.bookingId, customer: doc.customer, date: doc.date, services: doc.services });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.type}_${doc.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showSuccess('Document HTML exported');
}

// Create a temporary shareable blob URL (opens in new tab) — note: blob URLs are ephemeral per session
function shareDocument(id) {
    const docs = getDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return showError('Document not found');
    const html = generateDocumentHTML({ id: doc.id, type: doc.type, bookingId: doc.bookingId, customer: doc.customer, date: doc.date, services: doc.services });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // We don't revoke immediately because the new tab may need it; it will be freed on unload
}

// Tab Navigation Function
function showTab(tabId) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to the clicked button
    const clickedButton = event ? event.target : null;
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    // Initialize charts when analytics tab is shown
    if (tabId === 'analytics') {
        setTimeout(() => {
            initializeCharts();
        }, 100);
    }
    
    // Refresh invoice data when invoice tab is shown
    if (tabId === 'invoices') {
        loadInvoiceBookings();
        loadInvoiceServices();
    }
}

// Quick Action Functions
function refreshData() {
    loadServices();
    loadBookings();
    loadAnalytics();
    showSuccess('Data refreshed successfully!');
}

function exportBookings() {
    exportToExcel();
}

function viewCustomers() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const customers = bookings.map(booking => ({
        name: `${booking.firstName || ''} ${booking.lastName || ''}`.trim(),
        phone: booking.phone || '',
        email: booking.email || '',
        vehicle: booking.vehicle || `${booking.vehicleMake || ''} ${booking.vehicleModel || ''} ${booking.vehicleYear || ''}`.trim()
    }));
    
    const customerList = customers.map(customer => 
        `${customer.name} | ${customer.phone} | ${customer.vehicle}`
    ).join('\n');
    
    alert(`All Customers (${customers.length}):\n\n${customerList}`);
}

function generateReport() {
    exportToPDF();
}

// Make functions globally available
window.showTab = showTab;
window.refreshData = refreshData;
window.exportBookings = exportBookings;
window.viewCustomers = viewCustomers;
window.generateReport = generateReport;
window.exportToPDF = exportToPDF;
window.exportToExcel = exportToExcel;
window.exportAnalytics = exportAnalytics;
window.generateInvoice = generateInvoice;
window.downloadInvoice = downloadInvoice;
window.loadCustomerFromBooking = loadCustomerFromBooking;
window.toggleService = toggleService;
window.exportDocumentHTML = exportDocumentHTML;
window.shareDocument = shareDocument;
// Payments UI helpers
async function fetchPayments(invoiceId) {
    try {
        const res = await fetch(`${API_BASE}/payments?invoice_id=${encodeURIComponent(invoiceId)}`);
        if (!res.ok) throw new Error('Failed to fetch payments');
        return await res.json();
    } catch (e) {
        console.warn('Fetch payments failed', e);
        return [];
    }
}

async function addPayment(invoiceId, amountTsh, method = 'manual', reference = '') {
    try {
        const res = await fetch(`${API_BASE}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ invoice_id: invoiceId, amount_tsh: amountTsh, method, reference })
        });
        if (!res.ok) throw new Error('Add payment failed');
        return await res.json();
    } catch (e) {
        console.warn('Add payment failed', e);
        throw e;
    }
}

// Render payments block into the invoice preview area
async function renderPaymentsBlock(invoiceId) {
    const payments = await fetchPayments(invoiceId);
    const container = document.getElementById('paymentsBlock');
    if (!container) return;
    if (!payments || payments.length === 0) {
        container.innerHTML = '<div style="padding:8px;color:#64748b">No payments recorded</div>';
        return;
    }
    container.innerHTML = payments.map(p => `
        <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eef2f7">
            <div>
                <div style="font-weight:700">TSh ${Number(p.amount_tsh).toLocaleString()}</div>
                <div style="font-size:0.85rem;color:#64748b">${p.method || 'manual'} • ${new Date(p.recorded_at || p.created_at || p.payment_date).toLocaleString()}</div>
            </div>
            <div style="text-align:right">${p.reference || ''}</div>
        </div>
    `).join('');
}

// Expose payments helpers globally
window.fetchPayments = fetchPayments;
window.addPayment = addPayment;
window.renderPaymentsBlock = renderPaymentsBlock;

// Patch: load bookings and analytics on dashboard show
window.showDashboard = function() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadServices();
    loadBookings();
    loadAnalytics();
};

// -------------------
// Mobile menu / sidebar controller (centralized)
// Adds a single, idempotent set of listeners and creates the mobile overlay if missing.
// Ensures aria-expanded and body scroll are handled consistently across pages.
// -------------------
(function initMobileMenu() {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            if (document.body.dataset.mobileMenuInitialized) return;
            document.body.dataset.mobileMenuInitialized = '1';

            // create overlay if missing
            let overlay = document.getElementById('mobileOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'mobileOverlay';
                overlay.className = 'mobile-overlay';
                document.body.appendChild(overlay);
            }

            const hamburger = document.getElementById('hamburger');
            const sidebar = document.querySelector('.sidebar');
            if (!hamburger || !sidebar) return;

            // guard against double-binding
            if (hamburger.dataset.mobileBound) return;
            hamburger.dataset.mobileBound = '1';

            const openSidebar = () => {
                sidebar.classList.add('active');
                overlay.classList.add('active');
                hamburger.setAttribute('aria-expanded', 'true');
                // prevent body scroll on mobile when sidebar open
                document.body.style.overflow = 'hidden';
            };
            const closeSidebar = () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            };
            const toggleSidebar = () => (sidebar.classList.contains('active') ? closeSidebar() : openSidebar());

            hamburger.addEventListener('click', function (e) {
                e.preventDefault();
                toggleSidebar();
            });

            // clicking overlay closes
            overlay.addEventListener('click', function () { closeSidebar(); });

            // click outside sidebar closes (mobile widths)
            document.addEventListener('click', function (e) {
                if (window.innerWidth > 900) return; // only for mobile/tablet
                const target = e.target;
                if (!sidebar.contains(target) && target !== hamburger && !hamburger.contains(target) && !overlay.contains(target)) {
                    if (sidebar.classList.contains('active')) closeSidebar();
                }
            });

            // escape key
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && sidebar.classList.contains('active')) closeSidebar();
            });

            // on resize ensure sidebar is closed on larger screens
            window.addEventListener('resize', function () {
                if (window.innerWidth > 900 && sidebar.classList.contains('active')) {
                    closeSidebar();
                }
            });
        } catch (err) {
            console.warn('Mobile menu init failed', err);
        }
    });
})();

# Technical Design Document
## Hunter Autoworks Admin Dashboard — Redesign & Full Functionality

---

## 1. Overview

This document describes the technical architecture and implementation plan for the admin dashboard redesign. The work is split into two layers:

- **Backend** — API fixes, new endpoints, security hardening
- **Frontend** — new shared modules, complete page rewrites, UI redesign

No new dependencies are introduced. The existing stack (Express, pg, JWT, vanilla JS, Chart.js, jsPDF, SheetJS) is used throughout.

---

## 2. File Structure (After Redesign)

```
website/admin/
├── index.html          ← Main dashboard (redesigned)
├── bookings.html       ← NEW: dedicated bookings page
├── quotes.html         ← NEW: dedicated quotes page
├── clients.html        ← Redesigned (was partial)
├── invoices.html       ← Redesigned (was partial)
├── documents.html      ← Redesigned (was partial)
├── reports.html        ← NEW: was empty stub
├── settings.html       ← NEW: was empty stub
├── styles-clean.css    ← Extended with new component styles
├── admin.js            ← Refactored (bug fixes, modular)
├── api.js              ← NEW: centralized API client
└── layout.js           ← NEW: shared sidebar/topbar injection

backend/
├── routes/
│   ├── admin.js        ← Add PUT /password endpoint, secure /register
│   ├── clients.js      ← Add auth to GET /
│   ├── bookings.js     ← Add status validation
│   └── dashboard.js    ← Extend /overview with booking stats + revenue
```

---

## 3. Backend Changes

### 3.1 `GET /api/dashboard/overview` — Extended

**File:** `backend/routes/dashboard.js`

Replace the current minimal query with a single parallel query set:

```js
// Run all queries in parallel for performance
const [totalRes, pendingRes, todayRevRes, monthRevRes, recentRes, overdueRes, issuedRes] = await Promise.all([
  client.query(`SELECT COUNT(*)::int AS total_bookings FROM bookings`),
  client.query(`SELECT COUNT(*)::int AS pending_bookings FROM bookings WHERE status = 'pending'`),
  client.query(`
    SELECT COALESCE(SUM(s.price), 0)::int AS today_revenue_tsh
    FROM bookings b
    LEFT JOIN services s ON b.service = s.name
    WHERE b.status = 'completed' AND DATE(b.created_at) = CURRENT_DATE
  `),
  client.query(`
    SELECT COALESCE(SUM(s.price), 0)::int AS monthly_revenue_tsh
    FROM bookings b
    LEFT JOIN services s ON b.service = s.name
    WHERE b.status = 'completed'
      AND EXTRACT(YEAR FROM b.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM b.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  `),
  client.query(`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10`),
  client.query(`SELECT COUNT(*)::int AS overdue_count, COALESCE(SUM(total_amount_tsh),0)::int AS overdue_total FROM invoices WHERE status = 'overdue'`),
  client.query(`SELECT COUNT(*)::int AS issued_count FROM invoices WHERE status IN ('sent','overdue')`)
]);

res.json({
  total_bookings: totalRes.rows[0].total_bookings,
  pending_bookings: pendingRes.rows[0].pending_bookings,
  today_revenue_tsh: todayRevRes.rows[0].today_revenue_tsh,
  monthly_revenue_tsh: monthRevRes.rows[0].monthly_revenue_tsh,
  recent_bookings: recentRes.rows,
  overdue: overdueRes.rows[0],
  issued: issuedRes.rows[0]
});
```

### 3.2 `GET /api/clients` — Add Auth

**File:** `backend/routes/clients.js`

```js
// Before (unauthenticated):
router.get('/', async (req, res) => { ... });

// After (authenticated):
router.get('/', auth, async (req, res) => { ... });
```

### 3.3 `POST /api/admin/register` — Add Auth

**File:** `backend/routes/admin.js`

```js
// Before:
router.post('/register', [...validators], async (req, res) => { ... });

// After:
router.post('/register', auth, [...validators], async (req, res) => { ... });
```

### 3.4 `PUT /api/admin/password` — New Endpoint

**File:** `backend/routes/admin.js`

```js
router.put('/password', auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8, max: 128 })
], async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.user.id;

  // For default admin (id=1), compare against env vars
  // For DB admins, fetch hash and bcrypt.compare
  // On match: bcrypt.hash newPassword, UPDATE admins SET password=$1 WHERE id=$2
  // Return 200 on success, 401 if currentPassword wrong
});
```

### 3.5 `PUT /api/bookings/:id` — Status Validation

**File:** `backend/routes/bookings.js`

```js
const VALID_STATUSES = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];

router.put('/:id', auth, async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  // ... existing update logic
});
```

### 3.6 `GET /api/bookings` — Monthly Revenue for Analytics

Add a new analytics endpoint for chart data:

**File:** `backend/routes/dashboard.js` — add route:

```
GET /api/dashboard/analytics
```

Returns monthly revenue for the current year (12 data points) and top 5 services by booking count:

```js
router.get('/analytics', async (req, res) => {
  const [monthlyRes, topServicesRes] = await Promise.all([
    client.query(`
      SELECT
        EXTRACT(MONTH FROM b.created_at)::int AS month,
        COALESCE(SUM(s.price), 0)::int AS revenue
      FROM bookings b
      LEFT JOIN services s ON b.service = s.name
      WHERE b.status = 'completed'
        AND EXTRACT(YEAR FROM b.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY month ORDER BY month
    `),
    client.query(`
      SELECT service, COUNT(*)::int AS booking_count
      FROM bookings
      GROUP BY service
      ORDER BY booking_count DESC
      LIMIT 5
    `)
  ]);
  res.json({
    monthly_revenue: monthlyRes.rows,   // [{month:1, revenue:50000}, ...]
    top_services: topServicesRes.rows   // [{service:'Oil Change', booking_count:12}, ...]
  });
});
```

---

## 4. Frontend Architecture

### 4.1 New Module: `api.js`

**File:** `website/admin/api.js`

Centralized fetch wrapper. All pages import this instead of writing raw `fetch` calls.

```js
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : 'https://hunter-autoworks-backend.onrender.com/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('admin_jwt');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-logout on 401/403
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('admin_jwt');
    window.location.href = '/admin/index.html';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Convenience methods
const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' })
};
```

### 4.2 New Module: `layout.js`

**File:** `website/admin/layout.js`

Injects the sidebar and topbar HTML into every page. Each page calls `initLayout({ title, activePage })`.

```js
function initLayout({ title = 'Dashboard', activePage = 'dashboard' }) {
  // Inject sidebar HTML with nav links, mark activePage as active
  // Inject topbar with title + logout button
  // Wire hamburger menu
  // Check auth — redirect to login if no JWT
  // Load business settings from localStorage for header display
}
```

**Nav links injected by layout.js:**
```
Dashboard    → index.html
Bookings     → bookings.html
Quotes       → quotes.html
Services     → index.html#services (tab)
Clients      → clients.html
Invoices     → invoices.html
Documents    → documents.html
Reports      → reports.html
Settings     → settings.html
```

### 4.3 Refactored `admin.js`

The existing 1800-line `admin.js` is refactored into focused sections. The file is kept as one file (no bundler) but organized with clear section headers:

```
SECTION 1: Auth (login, logout, token management)
SECTION 2: Dashboard (loadDashboardOverview, renderStatCards, renderRecentBookings)
SECTION 3: Bookings (loadBookings, renderBookingsTable, updateBookingStatus, pollBookings)
SECTION 4: Quotes (loadQuotes, renderQuotesTable, convertQuoteToBooking)
SECTION 5: Services (loadServices — FIXED, addService, editService, deleteService — FIXED to use .id)
SECTION 6: Clients (loadClients, renderClientsTable, clientCRUD)
SECTION 7: Analytics (loadAnalytics, renderCharts — FIXED to use API not localStorage)
SECTION 8: Documents (loadDocuments from API, generateDocument, saveDocument, downloadPDF)
SECTION 9: UI Utilities (showToast, showModal, closeModal, showSkeleton, renderBadge, escapeHtml)
SECTION 10: Tab/Page Router (showTab, initPage)
```

**Key bug fixes in admin.js:**

```js
// BUG FIX 1: loadServices() — remove early return
async function loadServices() {
  const serviceList = document.getElementById('serviceList');
  if (!serviceList) return;
  try {
    const services = await api.get('/services');  // ← was: return services; here (BUG)
    window._services = services;                   // store for other functions
    renderServiceList(services);                   // ← was never reached
  } catch (e) {
    showError('Failed to load services.');
  }
}

// BUG FIX 2: editService/deleteService — use .id not ._id
async function editService(id) {
  const service = window._services.find(s => s.id === id);  // ← was: services[index]
  // ... modal with PUT /api/services/${service.id}          // ← was: service._id
}

// BUG FIX 3: loadAnalytics — use API not localStorage
async function loadAnalytics() {
  const [overview, bookings, analytics] = await Promise.all([
    api.get('/dashboard/overview'),
    api.get('/bookings'),
    api.get('/dashboard/analytics')
  ]);
  // compute chart data from API responses, not localStorage
}
```

---

## 5. Page Designs

### 5.1 `index.html` — Main Dashboard

**Layout:** `.app-shell` → `.sidebar` + `.main-area`

**Content sections (tabs removed — replaced with dedicated pages):**
```
Topbar: "Dashboard" title + Logout
Stats row: 4x .compact-stat-card (Total Bookings, Pending, Today Revenue, Monthly Revenue)
Recent Bookings: .card with table of last 10 bookings
Quick Actions: .card with links to Bookings, Quotes, Clients, Invoices
```

**Data source:** `GET /api/dashboard/overview` on load.

**Skeleton loading:** All 4 stat cards show `.skeleton` divs while loading.

### 5.2 `bookings.html` — NEW Dedicated Page

**Layout:** `.app-shell` → `.sidebar` + `.main-area`

```
Topbar: "Bookings" + Logout
Toolbar: [Search input] [Status filter dropdown] [Refresh button]
Table: .data-table with columns: ID | Customer | Phone | Vehicle | Service | Date | Status | Actions
Actions per row: [View] [Status dropdown] [Delete]
Polling: every 30s, toast on new booking
Details modal: full booking info
```

**Data source:** `GET /api/bookings` (auth required).

### 5.3 `quotes.html` — NEW Dedicated Page

**Layout:** `.app-shell` → `.sidebar` + `.main-area`

```
Topbar: "Quotes" + Logout
Toolbar: [Search input] [Status filter]
Table: .data-table with columns: ID | Customer | Phone | Vehicle | Service | Status | Date | Actions
Actions per row: [View] [Status dropdown] [Convert to Booking] [Delete]
Convert modal: pre-filled booking form
```

**Data source:** `GET /api/quotes` (auth required).

### 5.4 `clients.html` — Redesigned

```
Topbar: "Clients" + Logout
Toolbar: [Search input] [New Client button]
Table: .data-table — Name | Phone | Email | Address | Actions
Actions: [Edit] [View History] [Delete]
History modal: bookings filtered by client email
```

### 5.5 `invoices.html` — Redesigned

```
Topbar: "Invoices" + Logout
Toolbar: [Status filter] [New Invoice button]
Table: .data-table — Invoice No | Client | Issue Date | Due Date | Total | Status | Actions
Actions: [View] [Mark Paid] [View Payments] [Delete]
New Invoice modal: client dropdown, date fields, dynamic line items, live total
Payment modal: paid date, method, amount
```

### 5.6 `documents.html` — Redesigned

```
Topbar: "Documents" + Logout
Toolbar: [Type filter] [New Document button]
Grid: .documents-grid — cards per document with type badge, customer, date, actions
New Document form: type select, customer (from bookings), date, service checkboxes, preview
Actions: [Preview] [Download PDF] [Delete]
```

**No localStorage** — all documents fetched from `GET /api/documents`.

### 5.7 `reports.html` — NEW (was stub)

```
Topbar: "Reports" + Logout
Date range: [From date] [To date] [Generate Report button]
Summary cards: Total Bookings | Completed | Cancelled | Revenue (TSh)
Detail table: Booking ID | Customer | Service | Date | Status | Revenue
Export row: [Export PDF] [Export Excel]
```

**Data source:** `GET /api/bookings` filtered client-side by date range.

### 5.8 `settings.html` — NEW (was stub)

```
Topbar: "Settings" + Logout
Section 1 — Change Password:
  [Current Password] [New Password] [Confirm Password] [Save button]
Section 2 — Business Information:
  [Business Name] [Phone] [Address] [Logo URL] [Save button]
Section 3 — Appearance:
  [Dark Mode toggle]
```

**Password:** calls `PUT /api/admin/password`.
**Business info:** saved to `localStorage.business_settings`.

---

## 6. CSS Additions to `styles-clean.css`

New component classes added (no existing classes modified):

```css
/* Data Tables */
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { background: var(--dark); color: white; padding: var(--space-3) var(--space-4); text-align: left; font-size: var(--text-sm); }
.data-table td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--gray-200); font-size: var(--text-sm); vertical-align: middle; }
.data-table tr:hover td { background: var(--gray-50); }
.data-table-wrapper { overflow-x: auto; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }

/* Toast Notifications */
.toast-container { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 99999; display: flex; flex-direction: column; gap: 0.5rem; }
.toast { background: var(--dark); color: white; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); box-shadow: var(--shadow-xl); font-size: var(--text-sm); font-weight: var(--font-semibold); animation: slideInRight 0.3s ease; max-width: 320px; }
.toast-success { border-left: 4px solid var(--success); }
.toast-error { border-left: 4px solid var(--danger); }
.toast-info { border-left: 4px solid var(--primary); }
@keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }

/* Toolbar */
.toolbar { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-6); flex-wrap: wrap; }
.toolbar-search { flex: 1; min-width: 200px; padding: var(--space-3) var(--space-4); border: 2px solid var(--gray-200); border-radius: var(--radius-md); font-size: var(--text-sm); }
.toolbar-search:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(0,178,255,0.1); }
.toolbar-select { padding: var(--space-3) var(--space-4); border: 2px solid var(--gray-200); border-radius: var(--radius-md); font-size: var(--text-sm); background: white; cursor: pointer; }

/* Page Header */
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-6); }
.page-header h1 { font-size: var(--text-2xl); font-weight: var(--font-extrabold); color: var(--text-primary); }

/* Status Select in Table */
.status-select { padding: 0.25rem 0.5rem; border: 1px solid var(--gray-200); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: var(--font-semibold); cursor: pointer; background: white; }

/* Modal Overlay */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: var(--space-4); }
.modal-panel { background: var(--card-bg); border-radius: var(--radius-xl); box-shadow: var(--shadow-2xl); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s ease; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-6); border-bottom: 1px solid var(--gray-200); }
.modal-header h2 { font-size: var(--text-xl); font-weight: var(--font-bold); }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--gray-500); line-height: 1; }
.modal-body { padding: var(--space-6); }
.modal-footer { padding: var(--space-4) var(--space-6); border-top: 1px solid var(--gray-200); display: flex; justify-content: flex-end; gap: var(--space-3); }

/* Line Items (Invoice) */
.line-items-table { width: 100%; border-collapse: collapse; margin-bottom: var(--space-4); }
.line-items-table th { font-size: var(--text-xs); font-weight: var(--font-semibold); color: var(--text-muted); text-transform: uppercase; padding: var(--space-2) var(--space-3); border-bottom: 2px solid var(--gray-200); }
.line-items-table td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--gray-100); }
.line-items-table input { width: 100%; padding: var(--space-2); border: 1px solid var(--gray-200); border-radius: var(--radius-sm); font-size: var(--text-sm); }

/* Chart containers */
.chart-card { background: var(--card-bg); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-md); }
.chart-card h3 { font-size: var(--text-lg); font-weight: var(--font-bold); margin-bottom: var(--space-4); }
.chart-wrapper { position: relative; height: 280px; }

/* Settings sections */
.settings-section { background: var(--card-bg); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-md); margin-bottom: var(--space-6); }
.settings-section h2 { font-size: var(--text-xl); font-weight: var(--font-bold); margin-bottom: var(--space-6); padding-bottom: var(--space-4); border-bottom: 1px solid var(--gray-200); }

/* Empty state */
.empty-table-row td { text-align: center; padding: var(--space-12); color: var(--text-muted); font-size: var(--text-base); }
```

---

## 7. Data Flow Diagrams

### 7.1 Booking Submission → Admin Dashboard

```
Customer fills booking.html
  → POST /api/bookings
    → DB INSERT into bookings table
      → Admin dashboard polls GET /api/bookings every 30s
        → New row appears in bookings table
          → Toast: "New booking received"
```

### 7.2 Dashboard Stats Load

```
Admin opens index.html
  → checkAuth() — JWT in localStorage?
    → YES: showDashboard()
      → GET /api/dashboard/overview (single call)
        → Returns: total_bookings, pending_bookings, today_revenue_tsh,
                   monthly_revenue_tsh, recent_bookings, overdue, issued
          → Render 4 stat cards + recent bookings table
    → NO: showLogin()
```

### 7.3 Invoice Creation

```
Admin clicks New Invoice
  → GET /api/clients → populate client dropdown
  → Admin fills form: client, dates, line items
  → Live total = SUM(qty × unit_price) computed in JS
  → Submit → POST /api/invoices { invoice_no, client_id, issue_date, due_date, total_amount_tsh, items[] }
    → DB INSERT invoices + invoice_items
      → Refresh invoice table
```

---

## 8. Implementation Order (Task Sequence)

The tasks are ordered to ensure each phase is independently testable:

**Phase 1 — Backend Fixes (no frontend changes)**
1. Extend `GET /api/dashboard/overview`
2. Add `GET /api/dashboard/analytics`
3. Add auth to `GET /api/clients`
4. Add auth to `POST /api/admin/register`
5. Add `PUT /api/admin/password`
6. Add status validation to `PUT /api/bookings/:id`

**Phase 2 — Frontend Infrastructure**
7. Create `api.js` (centralized fetch wrapper)
8. Create `layout.js` (shared sidebar/topbar)
9. Add new CSS components to `styles-clean.css`

**Phase 3 — Fix Existing Pages**
10. Fix `admin.js` bugs (loadServices, editService, deleteService, analytics)
11. Redesign `index.html` (dashboard overview)
12. Redesign `clients.html`
13. Redesign `invoices.html`
14. Redesign `documents.html`

**Phase 4 — New Pages**
15. Create `bookings.html` (with polling)
16. Create `quotes.html` (with convert-to-booking)
17. Create `reports.html` (date range + export)
18. Create `settings.html` (password + business info)

**Phase 5 — Analytics**
19. Fix analytics charts in `index.html` (use API data)

---

## 9. Shared UI Patterns

### Toast Notification System

```js
function showToast(message, type = 'info', duration = 5000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}
```

### Status Badge Renderer

```js
const STATUS_BADGE_MAP = {
  pending:     'badge-warning',
  confirmed:   'badge-primary',
  'in-progress': 'badge-purple',
  completed:   'badge-success',
  cancelled:   'badge-danger',
  converted:   'badge-success',
  draft:       'badge-warning',
  sent:        'badge-primary',
  paid:        'badge-success',
  overdue:     'badge-danger'
};

function renderBadge(status) {
  const cls = STATUS_BADGE_MAP[status] || 'badge-warning';
  return `<span class="badge ${cls}">${status}</span>`;
}
```

### Skeleton Loading

```js
function showSkeletons(containerId, count = 4) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(count).fill(0).map(() =>
    `<div class="skeleton" style="height:80px;border-radius:var(--radius-lg);"></div>`
  ).join('');
}
```

### Confirmation Dialog

```js
function confirmAction(message) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-panel" style="max-width:400px">
        <div class="modal-header"><h2>Confirm</h2></div>
        <div class="modal-body"><p>${escapeHtml(message)}</p></div>
        <div class="modal-footer">
          <button class="compact-btn compact-btn-outline" id="confirmNo">Cancel</button>
          <button class="action-btn" id="confirmYes">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#confirmYes').onclick = () => { modal.remove(); resolve(true); };
    modal.querySelector('#confirmNo').onclick = () => { modal.remove(); resolve(false); };
  });
}
```

---

## 10. Security Considerations

| Issue | Fix |
|---|---|
| `GET /api/clients` unauthenticated | Add `auth` middleware |
| `POST /api/admin/register` unauthenticated | Add `auth` middleware |
| JWT secret defaults to `'secret'` | `env-validator.js` already checks this — ensure it throws in production |
| Demo credentials shown in login UI | Wrap in `if (NODE_ENV !== 'production')` check |
| No booking status validation | Add allowlist check before DB update |
| `editService` uses `_id` (MongoDB leftover) | Change to `service.id` |

---

## 11. Constraints & Non-Goals

- **No new npm packages** — use only what's already in `package.json`
- **No CSS framework** — extend `styles-clean.css` only
- **No build step** — all JS is plain ES6, loaded via `<script>` tags
- **No React/Vue/Angular** — vanilla JS only
- **Backward compatible** — public website (`index.html`, `booking.html`) is not touched
- **No database migrations** — all new queries use existing tables
- **The `hunter auto/hunter auto/` nested duplicate folder** is not touched

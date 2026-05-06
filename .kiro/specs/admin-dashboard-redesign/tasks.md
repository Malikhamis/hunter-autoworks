# Implementation Tasks
## Hunter Autoworks Admin Dashboard — Redesign & Full Functionality

---

## Phase 1 — Backend Fixes

- [x] 1. Extend `GET /api/dashboard/overview` with booking stats and revenue
  - Replace the two-query body in `backend/routes/dashboard.js` with 7 parallel queries using `Promise.all`
  - Add `total_bookings`, `pending_bookings`, `today_revenue_tsh`, `monthly_revenue_tsh`, `recent_bookings` to the response
  - Revenue queries LEFT JOIN `bookings` with `services` on `bookings.service = services.name`
  - Keep existing `overdue` and `issued` fields
  - **Acceptance:** `GET /api/dashboard/overview` returns all 7 fields with correct integer types

- [x] 2. Add `GET /api/dashboard/analytics` endpoint
  - Add new route in `backend/routes/dashboard.js`
  - Returns `monthly_revenue` (12 months, current year) and `top_services` (top 5 by booking count)
  - **Acceptance:** endpoint returns `{ monthly_revenue: [{month, revenue}], top_services: [{service, booking_count}] }`

- [x] 3. Add auth middleware to `GET /api/clients`
  - In `backend/routes/clients.js`, add `auth` as second argument to `router.get('/', ...)`
  - **Acceptance:** `GET /api/clients` without token returns HTTP 401

- [x] 4. Add auth middleware to `POST /api/admin/register`
  - In `backend/routes/admin.js`, add `auth` before the validators array on the register route
  - **Acceptance:** `POST /api/admin/register` without token returns HTTP 401

- [x] 5. Add `PUT /api/admin/password` endpoint
  - Add new route in `backend/routes/admin.js` with `auth` middleware
  - Validate `currentPassword` (notEmpty) and `newPassword` (length 8–128)
  - For default admin (id=1): compare `currentPassword` against `DEFAULT_ADMIN_PASSWORD` env var
  - For DB admins: fetch hash from `admins` table, `bcrypt.compare`, then `bcrypt.hash` and UPDATE
  - Return 200 on success, 401 if current password wrong, 400 if validation fails
  - **Acceptance:** correct current password + valid new password returns 200; wrong current password returns 401

- [x] 6. Add status validation to `PUT /api/bookings/:id`
  - In `backend/routes/bookings.js`, define `VALID_STATUSES` array
  - Return HTTP 400 with error message if `status` not in the array
  - **Acceptance:** `PUT /api/bookings/:id` with `status: 'invalid'` returns HTTP 400

---

## Phase 2 — Frontend Infrastructure

- [x] 7. Create `website/admin/api.js`
  - Centralized fetch wrapper with auto-detect API_BASE (localhost vs production)
  - Attach `Authorization: Bearer <token>` header from `localStorage.admin_jwt`
  - Auto-logout (clear JWT + redirect to index.html) on HTTP 401/403 response
  - Throw `Error` with server's error message on non-OK responses
  - Export `api` object with `get`, `post`, `put`, `delete` methods
  - **Acceptance:** all methods attach auth header; 401 response triggers redirect to login

- [x] 8. Create `website/admin/layout.js`
  - `initLayout({ title, activePage })` function that injects sidebar HTML and topbar HTML into the page
  - Sidebar nav links: Dashboard, Bookings, Quotes, Clients, Invoices, Documents, Reports, Settings
  - Mark the `activePage` nav link with class `active`
  - Wire hamburger button to toggle `.sidebar.active` and overlay
  - Wire logout button to clear JWT and redirect to index.html
  - Check for JWT on load — redirect to index.html if missing (except on index.html itself)
  - **Acceptance:** sidebar renders on all pages; active link highlighted; hamburger works on mobile

- [x] 9. Add new CSS components to `website/admin/styles-clean.css`
  - Add `.data-table`, `.data-table-wrapper`, `.data-table th`, `.data-table td` styles
  - Add `.toolbar`, `.toolbar-search`, `.toolbar-select` styles
  - Add `.toast-container`, `.toast`, `.toast-success`, `.toast-error`, `.toast-info` with `slideInRight` animation
  - Add `.modal-overlay`, `.modal-panel`, `.modal-header`, `.modal-body`, `.modal-footer`, `.modal-close` styles
  - Add `.page-header` styles
  - Add `.line-items-table` styles for invoice line items
  - Add `.chart-card`, `.chart-wrapper` styles
  - Add `.settings-section` styles
  - Add `.empty-table-row` styles
  - Add `.status-select` styles
  - **Acceptance:** all new classes render correctly; no existing classes broken

---

## Phase 3 — Fix & Redesign Existing Pages

- [x] 10. Fix bugs in `website/admin/admin.js`
  - **Fix 1:** Remove early `return services;` from `loadServices()` so DOM rendering code executes
  - **Fix 2:** Change `editService(index)` to look up service by `id` from `window._services` array, use `service.id` in PUT URL
  - **Fix 3:** Change `deleteService(index)` to look up service by `id`, use `service.id` in DELETE URL
  - **Fix 4:** Store loaded services in `window._services` after fetch for cross-function access
  - **Fix 5:** Replace `loadAnalytics()` chart data source from `localStorage` to `api.get('/bookings')` and `api.get('/dashboard/analytics')`
  - **Fix 6:** Replace all inline `fetch()` calls with `api.get/post/put/delete()` from `api.js`
  - **Acceptance:** services list renders after page load; edit/delete work without errors; charts show real data

- [x] 11. Redesign `website/admin/index.html` — Dashboard Overview
  - Replace all inline `style` attributes with CSS classes from `styles-clean.css`
  - Remove the tab system (Dashboard/Services/Analytics/Documents tabs) — each section gets its own page
  - Keep only: login screen, stat cards, recent bookings table, quick action links
  - Stat cards use `.compact-stat-card` with `.skeleton` loading state
  - Recent bookings use `.data-table` inside a `.card`
  - Quick actions: card links to bookings.html, quotes.html, clients.html, invoices.html
  - Load data from `GET /api/dashboard/overview` on login
  - Include `<script src="api.js">` and `<script src="layout.js">` before `admin.js`
  - **Acceptance:** dashboard loads real stats; no inline styles; skeleton shows during load

- [x] 12. Redesign `website/admin/clients.html`
  - Replace all inline styles with CSS classes
  - Add `.app-shell` layout with sidebar (via `layout.js`) and topbar
  - Add `.toolbar` with search input and "New Client" button
  - Render clients in `.data-table` with columns: Name, Phone, Email, Address, Actions
  - Actions: Edit (opens modal), View History (opens modal with bookings), Delete (confirm dialog)
  - Client search filters table client-side (debounced 300ms)
  - All API calls via `api.js`
  - **Acceptance:** clients load from API; CRUD works; search filters correctly; no inline styles

- [x] 13. Redesign `website/admin/invoices.html`
  - Replace all inline styles with CSS classes
  - Add `.app-shell` layout with sidebar and topbar
  - Add `.toolbar` with status filter dropdown and "New Invoice" button
  - Render invoices in `.data-table` with columns: Invoice No, Client, Issue Date, Due Date, Total, Status, Actions
  - Status badges use `renderBadge()` helper
  - New Invoice modal: client dropdown (from `GET /api/clients`), date fields, dynamic line items with live total
  - Mark as Paid modal: paid date, method, amount fields
  - View Payments modal: fetches `GET /api/payments?invoice_id=:id`
  - All API calls via `api.js`
  - **Acceptance:** invoices load; new invoice creates with line items; mark paid works; no inline styles

- [x] 14. Redesign `website/admin/documents.html`
  - Replace all inline styles with CSS classes
  - Add `.app-shell` layout with sidebar and topbar
  - Remove localStorage as primary store — fetch from `GET /api/documents` on load
  - Render documents in a grid of `.card` elements with type badge, customer, date, actions
  - New Document form: type select, customer dropdown (from recent bookings), date, service checkboxes
  - Preview renders using Business_Settings from `localStorage.business_settings`
  - Save calls `POST /api/documents`; delete calls `DELETE /api/documents/:id`
  - Download PDF uses jsPDF on stored HTML
  - **Acceptance:** documents load from API; save/delete work; PDF download works; no inline styles

---

## Phase 4 — New Pages

- [x] 15. Create `website/admin/bookings.html`
  - Full `.app-shell` layout using `layout.js` with `activePage: 'bookings'`
  - `.toolbar` with text search input, status filter dropdown, refresh button
  - `.data-table` with columns: Booking ID, Customer Name, Phone, Vehicle, Service, Date, Status, Actions
  - Per-row status dropdown (`.status-select`) calls `PUT /api/bookings/:id` on change
  - Row click opens details modal with all booking fields
  - Delete button shows `confirmAction()` dialog then calls `DELETE /api/bookings/:id`
  - Polling: `setInterval` every 30s calls `GET /api/bookings`; compares count to previous; shows toast if new bookings
  - Status badges use `renderBadge()` helper
  - Empty state: `.empty-table-row` with "No bookings yet" message
  - **Acceptance:** bookings load; status update works; polling fires every 30s; toast appears on new booking; search/filter work

- [x] 16. Create `website/admin/quotes.html`
  - Full `.app-shell` layout using `layout.js` with `activePage: 'quotes'`
  - `.toolbar` with search input and status filter
  - `.data-table` with columns: ID, Customer, Phone, Vehicle, Service, Status, Date, Actions
  - Per-row status dropdown calls `PUT /api/quotes/:id` on change
  - "Convert to Booking" button opens modal pre-filled with quote data
  - Convert modal submits `POST /api/bookings` then `PUT /api/quotes/:id` with `status: 'converted'`
  - Delete button shows confirm dialog then calls `DELETE /api/quotes/:id`
  - **Acceptance:** quotes load; status update works; convert creates booking and updates quote status

- [x] 17. Create `website/admin/reports.html`
  - Full `.app-shell` layout using `layout.js` with `activePage: 'reports'`
  - Date range inputs: "From" and "To" date pickers
  - "Generate Report" button fetches `GET /api/bookings` and filters client-side by date range
  - Summary cards: Total Bookings, Completed, Cancelled, Revenue (TSh) for the period
  - Detail table: Booking ID, Customer, Service, Date, Status, Revenue (TSh)
  - Revenue per booking = service price looked up from `window._services` by service name
  - "Export PDF" button: uses jsPDF to generate PDF with summary + table, filename `report_YYYY-MM-DD.pdf`
  - "Export Excel" button: uses SheetJS to generate `.xlsx`, filename `report_YYYY-MM-DD.xlsx`
  - Empty state when no date range selected or no results
  - **Acceptance:** report generates correctly for date range; PDF and Excel exports download; no inline styles

- [x] 18. Create `website/admin/settings.html`
  - Full `.app-shell` layout using `layout.js` with `activePage: 'settings'`
  - Section 1 — Change Password: current password, new password (min 8), confirm password fields
    - Validate new === confirm before submitting
    - Call `PUT /api/admin/password`; show success toast or inline error
  - Section 2 — Business Information: Business Name, Phone, Address, Logo URL fields
    - On save: write to `localStorage.business_settings` as JSON
    - On load: read from `localStorage.business_settings` and pre-fill fields
  - Section 3 — Appearance: dark mode toggle button
    - Toggle `dark-mode` class on `<body>`; persist preference to `localStorage.dark_mode`
  - **Acceptance:** password change calls API correctly; business info persists to localStorage; dark mode toggles

---

## Phase 5 — Analytics

- [x] 19. Fix analytics charts in `website/admin/index.html`
  - Add an Analytics section/page or integrate into index.html as a separate card section
  - "Revenue by Month" bar chart: data from `GET /api/dashboard/analytics` → `monthly_revenue` array
    - Build 12-month labels array; fill in revenue values from API (0 for months with no data)
  - "Bookings by Status" doughnut chart: data from `GET /api/bookings` → count by status
  - "Top Services" horizontal bar chart: data from `GET /api/dashboard/analytics` → `top_services` array
  - Destroy and recreate Chart.js instances on each data reload to prevent canvas reuse errors
  - Show loading spinner inside `.chart-wrapper` while fetching
  - Show "No data available" label if API returns empty arrays
  - **Acceptance:** all 3 charts render with real API data; no localStorage reads; charts update on refresh

---

## Notes

- Tasks in each phase are independent within the phase but phases must be completed in order (backend before frontend)
- Each task should be verified against its acceptance criteria before marking complete
- The public website files (`website/index.html`, `website/booking.html`) are not modified
- The nested `hunter auto/hunter auto/` directory is not touched
- Run `node backend/server.js` to test backend changes locally
- Open `website/admin/index.html` directly in browser (or via `backend/serve_website.js`) to test frontend changes

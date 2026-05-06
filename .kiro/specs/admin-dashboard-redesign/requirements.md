# Requirements Document

## Introduction

This document defines the requirements for the Hunter Autoworks Admin Dashboard Redesign & Full Functionality project. The existing admin dashboard (`website/admin/`) is a vanilla HTML/CSS/JS single-page application backed by a Node.js/Express + PostgreSQL API. The redesign addresses four categories of work:

1. **Bug fixes** — early-return in `loadServices`, revenue always showing TSh 0, `editService`/`deleteService` using stale MongoDB `_id` field, charts reading from `localStorage` instead of the API.
2. **Security hardening** — unauthenticated `GET /api/clients`, unauthenticated `POST /api/admin/register`, weak JWT secret fallback.
3. **Feature completion** — Reports page (stub), Settings page (stub), real-time booking polling, quote-to-booking conversion, analytics from live DB data.
4. **UI redesign** — consistent use of the existing CSS design system (`styles-clean.css`), no inline styles, proper sidebar navigation, responsive mobile layout.

All new frontend code must use the existing CSS variables and component classes. No new CSS frameworks may be introduced.

---

## Glossary

- **Admin_Dashboard**: The set of HTML pages under `website/admin/` that constitute the admin panel.
- **API**: The Node.js/Express backend running on port 5001 (dev) or `https://hunter-autoworks-backend.onrender.com` (prod).
- **JWT**: JSON Web Token issued by `POST /api/admin/login`, stored in `localStorage` as `admin_jwt`, sent as `Authorization: Bearer <token>` on every authenticated request.
- **Booking**: A service appointment record in the `bookings` table, submitted by a customer on the public website.
- **Quote**: A price-enquiry record in the `quotes` table, submitted by a customer on the public website.
- **Service**: An automotive service offered by Hunter Autoworks, stored in the `services` table with `id`, `name`, `price`, `icon`, `description`, and `features[]`.
- **Client**: A business client record in the `clients` table, managed exclusively by admins.
- **Invoice**: A billing document in the `invoices` table, linked to a Client via `client_id`, with line items in `invoice_items`.
- **Document**: A generated PDF-ready record (estimate, quotation, proforma invoice, or invoice) stored in the `documents` table.
- **Revenue**: The sum of `services.price` for all bookings whose `status = 'completed'`, joined via the booking's `service` name field.
- **Dashboard_Overview**: The `GET /api/dashboard/overview` endpoint, which must be extended to return booking counts and revenue figures.
- **Polling_Interval**: A 30-second `setInterval` timer that re-fetches bookings from the API to surface new submissions without a page reload.
- **CSS_Design_System**: The variables and component classes defined in `website/admin/styles-clean.css` (e.g., `--primary`, `--dark`, `.card`, `.action-btn`, `.badge`).
- **Business_Settings**: Admin-configurable values (business name, phone, address, logo URL) used as the header in generated Documents.

---

## Requirements

### Requirement 1: Authentication & Session Management

**User Story:** As an admin, I want to log in with my credentials and have my session persist across page refreshes, so that I do not have to re-authenticate every time I open the dashboard.

#### Acceptance Criteria

1. WHEN an admin submits valid credentials to `POST /api/admin/login`, THE Admin_Dashboard SHALL store the returned JWT in `localStorage` under the key `admin_jwt` and display the authenticated dashboard view.
2. WHEN an admin submits invalid credentials, THE Admin_Dashboard SHALL display an inline error message within the login form without reloading the page.
3. WHEN the Admin_Dashboard page loads and a valid JWT exists in `localStorage`, THE Admin_Dashboard SHALL skip the login screen and render the authenticated view directly.
4. WHEN an admin clicks the Logout button, THE Admin_Dashboard SHALL remove the JWT from `localStorage`, clear all in-memory data, and render the login screen.
5. WHEN any authenticated API request returns HTTP 401 or 403, THE Admin_Dashboard SHALL clear the JWT from `localStorage` and redirect the user to the login screen.
6. THE API SHALL protect `POST /api/admin/register` with the `auth` middleware so that only an authenticated admin can create new admin accounts.
7. THE API SHALL protect `GET /api/clients` with the `auth` middleware so that client data is not publicly accessible.
8. WHEN the login form is submitted, THE Admin_Dashboard SHALL disable the submit button and show a loading indicator until the API responds.
9. IF the login rate limit of 5 attempts per 15 minutes is exceeded, THEN THE API SHALL return HTTP 429 and THE Admin_Dashboard SHALL display the rate-limit message to the user.

---

### Requirement 2: Dashboard Overview — Real Statistics

**User Story:** As an admin, I want the dashboard home screen to show accurate counts and revenue figures drawn from the database, so that I can assess the business at a glance.

#### Acceptance Criteria

1. WHEN the authenticated dashboard loads, THE Dashboard_Overview SHALL display: total booking count, pending booking count, today's revenue (TSh), and current-month revenue (TSh).
2. THE API `GET /api/dashboard/overview` SHALL return a JSON object containing `total_bookings` (integer), `pending_bookings` (integer), `today_revenue_tsh` (integer), `monthly_revenue_tsh` (integer), and `recent_bookings` (array of the 10 most recent bookings ordered by `created_at DESC`).
3. THE API SHALL calculate `today_revenue_tsh` as the sum of `services.price` for all bookings where `status = 'completed'` and `DATE(bookings.created_at) = CURRENT_DATE`, joined on `bookings.service = services.name`.
4. THE API SHALL calculate `monthly_revenue_tsh` as the sum of `services.price` for all bookings where `status = 'completed'` and `EXTRACT(YEAR FROM bookings.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)` and `EXTRACT(MONTH FROM bookings.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)`, joined on `bookings.service = services.name`.
5. THE Dashboard_Overview SHALL render each stat in a `.compact-stat-card` element using the CSS_Design_System, with no inline `style` attributes.
6. WHEN the dashboard data is loading, THE Dashboard_Overview SHALL display skeleton placeholder cards using the `.skeleton` CSS class.
7. IF the API returns an error, THEN THE Dashboard_Overview SHALL display an error banner using the `.error-message` CSS class and retain the last successfully loaded values.
8. THE Dashboard_Overview SHALL display the `recent_bookings` list with customer name, service name, booking date, and a status badge styled with the appropriate `.badge-*` class.

---

### Requirement 3: Bookings Management

**User Story:** As an admin, I want to view, search, filter, and update the status of all bookings in a table, so that I can manage the workshop schedule efficiently.

#### Acceptance Criteria

1. WHEN the Bookings tab is active, THE Admin_Dashboard SHALL fetch all bookings from `GET /api/bookings` and render them in a sortable table with columns: Booking ID, Customer Name, Phone, Vehicle, Service, Date, Status.
2. THE Admin_Dashboard SHALL provide a text search input that filters the displayed bookings client-side by customer name, phone, or service name without an additional API call.
3. THE Admin_Dashboard SHALL provide a status filter dropdown with options: All, Pending, Confirmed, In-Progress, Completed, Cancelled.
4. WHEN an admin selects a new status from a per-row status dropdown, THE Admin_Dashboard SHALL call `PUT /api/bookings/:id` with the new status and update the row's status badge without a full page reload.
5. WHEN an admin clicks a booking row, THE Admin_Dashboard SHALL open a details modal showing all booking fields: first name, last name, phone, email, vehicle make/model/year, service, message, booking date, time slot, and current status.
6. THE Admin_Dashboard SHALL poll `GET /api/bookings` every 30 seconds (Polling_Interval) while the Bookings tab is active and update the table with any new or changed bookings.
7. WHEN a new booking arrives during polling, THE Admin_Dashboard SHALL display a non-blocking toast notification: "New booking received."
8. THE Admin_Dashboard SHALL render booking status badges using the CSS_Design_System `.badge` classes: `.badge-warning` for pending, `.badge-primary` for confirmed, `.badge-purple` for in-progress, `.badge-success` for completed, `.badge-danger` for cancelled.
9. IF `GET /api/bookings` returns an error, THEN THE Admin_Dashboard SHALL display an error message and stop the polling interval.
10. THE Admin_Dashboard SHALL allow an admin to delete a booking via a confirmation dialog before calling `DELETE /api/bookings/:id`.

---

### Requirement 4: Quotes Management

**User Story:** As an admin, I want to view all quote requests, update their status, and convert a quote into a booking, so that I can follow up on customer enquiries efficiently.

#### Acceptance Criteria

1. WHEN the Quotes tab is active, THE Admin_Dashboard SHALL fetch all quotes from `GET /api/quotes` and render them in a table with columns: ID, Customer Name, Phone, Vehicle, Service, Message, Status, Date.
2. WHEN an admin selects a new status from a per-row status dropdown, THE Admin_Dashboard SHALL call `PUT /api/quotes/:id` with the new status and update the row without a full page reload.
3. WHEN an admin clicks "Convert to Booking" on a quote row, THE Admin_Dashboard SHALL open a pre-filled booking form modal populated with the quote's name, phone, email, vehicle, and service fields.
4. WHEN the admin submits the pre-filled booking form, THE Admin_Dashboard SHALL call `POST /api/bookings` with the form data and, on success, update the quote's status to `'converted'` via `PUT /api/quotes/:id`.
5. THE Admin_Dashboard SHALL render quote status badges using the CSS_Design_System `.badge` classes consistent with the booking status colour scheme.
6. THE Admin_Dashboard SHALL allow an admin to delete a quote via a confirmation dialog before calling `DELETE /api/quotes/:id`.

---

### Requirement 5: Services Management

**User Story:** As an admin, I want to create, edit, and delete services with full details including icon, price, description, and feature list, so that the public website and documents always reflect the current service catalogue.

#### Acceptance Criteria

1. WHEN the Services tab is active, THE Admin_Dashboard SHALL fetch all services from `GET /api/services` and render each as a card showing icon, name, price, description, and features list.
2. WHEN an admin submits the Add Service form with a valid name and price, THE Admin_Dashboard SHALL call `POST /api/services` with `{ name, price, icon, description, features }` and refresh the services list on success.
3. WHEN an admin clicks Edit on a service card, THE Admin_Dashboard SHALL open a modal pre-filled with the service's current `id`, `name`, `price`, `icon`, `description`, and `features`, and on save SHALL call `PUT /api/services/:id` using `service.id` (not `service._id`).
4. WHEN an admin clicks Delete on a service card, THE Admin_Dashboard SHALL show a confirmation dialog and on confirmation SHALL call `DELETE /api/services/:id` using `service.id` (not `service._id`).
5. THE Admin_Dashboard SHALL provide an emoji icon picker with at least 12 common automotive emoji options (e.g., 🔧 🔍 🛢️ 🛑 ⚙️ ❄️ 🚗 🔋 🛞 🪛 🔩 💡).
6. THE Admin_Dashboard SHALL provide a dynamic features list editor where an admin can add or remove individual feature strings before saving.
7. IF `POST /api/services` or `PUT /api/services/:id` returns an error, THEN THE Admin_Dashboard SHALL display the error message inside the modal without closing it.
8. THE `loadServices` function SHALL NOT contain an early `return` statement before the DOM rendering logic, ensuring the service list is always rendered after a successful API response.

---

### Requirement 6: Clients Management

**User Story:** As an admin, I want to create, view, edit, and delete client records and see each client's booking history, so that I can manage business relationships effectively.

#### Acceptance Criteria

1. WHEN the Clients page loads, THE Admin_Dashboard SHALL fetch clients from `GET /api/clients` (authenticated) and render them in a table with columns: Name, Phone, Email, Address, Actions.
2. WHEN an admin submits the New Client form with a valid name, THE Admin_Dashboard SHALL call `POST /api/clients` and refresh the client list on success.
3. WHEN an admin clicks Edit on a client row, THE Admin_Dashboard SHALL open a modal pre-filled with the client's `name`, `contact_phone`, `contact_email`, `address`, and `notes`, and on save SHALL call `PUT /api/clients/:id`.
4. WHEN an admin clicks Delete on a client row, THE Admin_Dashboard SHALL show a confirmation dialog and on confirmation SHALL call `DELETE /api/clients/:id`.
5. WHEN an admin clicks "View History" on a client row, THE Admin_Dashboard SHALL open a modal that fetches and displays all bookings where `email` matches the client's `contact_email`, ordered by `created_at DESC`.
6. THE Admin_Dashboard SHALL provide a client search input that filters the displayed list client-side by name, phone, or email.

---

### Requirement 7: Invoices Management

**User Story:** As an admin, I want to create invoices with line items, mark them as paid, and view payment history, so that I can track revenue and billing accurately.

#### Acceptance Criteria

1. WHEN the Invoices page loads, THE Admin_Dashboard SHALL fetch invoices from `GET /api/invoices` and render them in a table with columns: Invoice No, Client, Issue Date, Due Date, Total (TSh), Status, Actions.
2. WHEN an admin clicks New Invoice, THE Admin_Dashboard SHALL open a form where the admin can select a client from a dropdown (populated from `GET /api/clients`), set issue date, due date, and add line items with description, quantity, and unit price.
3. THE Admin_Dashboard SHALL calculate and display the invoice total in real time as line items are added or edited, using the formula: `SUM(quantity × unit_price_tsh)` for all line items.
4. WHEN an admin submits the New Invoice form with at least one line item and a valid client, THE Admin_Dashboard SHALL call `POST /api/invoices` with `{ invoice_no, client_id, status, issue_date, due_date, total_amount_tsh, items[] }` and refresh the invoice list on success.
5. WHEN an admin clicks "Mark as Paid" on an invoice, THE Admin_Dashboard SHALL open a payment modal with fields for paid date, payment method, and amount, then call `POST /api/invoices/:id/mark_paid`.
6. WHEN an admin clicks "View Payments" on an invoice, THE Admin_Dashboard SHALL fetch `GET /api/payments?invoice_id=:id` and display the payment history in a modal.
7. THE Admin_Dashboard SHALL render invoice status badges: `draft` → `.badge-warning`, `sent` → `.badge-primary`, `paid` → `.badge-success`, `overdue` → `.badge-danger`.
8. WHEN an admin clicks Delete on an invoice, THE Admin_Dashboard SHALL show a confirmation dialog and on confirmation SHALL call `DELETE /api/invoices/:id`.
9. THE Admin_Dashboard SHALL allow filtering invoices by status using a dropdown filter.

---

### Requirement 8: Documents — Generation & Persistence

**User Story:** As an admin, I want to generate estimates, quotations, proforma invoices, and invoices as PDF-ready documents, save them to the server, and download them as PDFs, so that I can provide professional paperwork to customers.

#### Acceptance Criteria

1. WHEN the Documents tab is active, THE Admin_Dashboard SHALL fetch all documents from `GET /api/documents` and render them in a grid with columns: Document ID, Type, Customer, Date, Actions.
2. WHEN an admin fills in the document form (type, customer, date, services) and clicks Generate, THE Admin_Dashboard SHALL render an HTML preview of the document using the Business_Settings header (name, phone, address) and the selected services with prices.
3. WHEN an admin clicks "Save Document", THE Admin_Dashboard SHALL call `POST /api/documents` with `{ doc_id, type, customer, doc_date, services, html }` and add the saved document to the grid on success.
4. THE Admin_Dashboard SHALL NOT use `localStorage` as the primary persistence layer for documents; all documents SHALL be fetched from and saved to the API.
5. WHEN an admin clicks "Download PDF" on a saved document, THE Admin_Dashboard SHALL use jsPDF to generate a PDF from the stored HTML and trigger a browser download.
6. WHEN an admin clicks Delete on a document, THE Admin_Dashboard SHALL show a confirmation dialog and on confirmation SHALL call `DELETE /api/documents/:id`.
7. THE document HTML preview SHALL use the Business_Settings values (name, phone, address) as the document header, falling back to "Hunter Autoworks" if Business_Settings are not yet configured.
8. THE Admin_Dashboard SHALL populate the customer dropdown in the document form from `GET /api/bookings` (recent bookings) to allow quick customer selection.

---

### Requirement 9: Analytics — Real Charts from Database

**User Story:** As an admin, I want to see charts of revenue by month and bookings by status drawn from live database data, so that I can understand business trends.

#### Acceptance Criteria

1. WHEN the Analytics tab is active, THE Admin_Dashboard SHALL fetch data from `GET /api/dashboard/overview` and `GET /api/bookings` to populate the charts.
2. THE Admin_Dashboard SHALL render a "Revenue by Month" bar chart using Chart.js, with one bar per month for the current calendar year, where each bar's value equals the sum of `services.price` for completed bookings in that month.
3. THE Admin_Dashboard SHALL render a "Bookings by Status" doughnut chart using Chart.js, showing the count of bookings in each status: pending, confirmed, in-progress, completed, cancelled.
4. THE Admin_Dashboard SHALL render a "Top Services" horizontal bar chart using Chart.js, showing the top 5 services by booking count.
5. THE Admin_Dashboard SHALL NOT read chart data from `localStorage`; all chart data SHALL be derived from API responses.
6. WHEN chart data is loading, THE Admin_Dashboard SHALL display a loading spinner inside each chart container.
7. IF the API returns an error while loading analytics data, THEN THE Admin_Dashboard SHALL display an error message and render empty charts with a "No data available" label.
8. THE Admin_Dashboard SHALL provide "Export PDF Report" and "Export Excel Report" buttons that generate reports from the currently loaded analytics data using jsPDF and SheetJS respectively.

---

### Requirement 10: Reports Page

**User Story:** As an admin, I want a dedicated Reports page where I can generate and export booking and revenue reports filtered by date range, so that I can produce business summaries on demand.

#### Acceptance Criteria

1. THE `website/admin/reports.html` page SHALL NOT be a stub; it SHALL render a fully functional reports interface within the Admin_Dashboard layout (sidebar + topbar).
2. THE Reports page SHALL provide a date range picker with "From" and "To" date inputs.
3. WHEN an admin clicks "Generate Report", THE Admin_Dashboard SHALL fetch bookings from `GET /api/bookings` and filter them client-side to the selected date range, then display a summary table with: total bookings, completed bookings, cancelled bookings, and total revenue (TSh) for the period.
4. THE Reports page SHALL display a detailed table of all bookings in the selected date range with columns: Booking ID, Customer, Service, Date, Status, Revenue (TSh).
5. WHEN an admin clicks "Export PDF", THE Admin_Dashboard SHALL use jsPDF to generate a PDF of the report summary and detail table and trigger a browser download with filename `report_YYYY-MM-DD.pdf`.
6. WHEN an admin clicks "Export Excel", THE Admin_Dashboard SHALL use SheetJS to generate an `.xlsx` file of the report detail table and trigger a browser download with filename `report_YYYY-MM-DD.xlsx`.
7. THE Reports page SHALL use the CSS_Design_System layout classes and SHALL NOT contain inline `style` attributes.

---

### Requirement 11: Settings Page

**User Story:** As an admin, I want a Settings page where I can update my password and configure business information used in generated documents, so that the admin panel reflects accurate business details.

#### Acceptance Criteria

1. THE `website/admin/settings.html` page SHALL NOT be a stub; it SHALL render a fully functional settings interface within the Admin_Dashboard layout (sidebar + topbar).
2. THE Settings page SHALL display a "Change Password" form with fields: current password, new password, confirm new password.
3. WHEN an admin submits the Change Password form with a valid new password (minimum 8 characters) and matching confirm field, THE Admin_Dashboard SHALL call `PUT /api/admin/password` (new endpoint) with `{ currentPassword, newPassword }` and display a success message on HTTP 200.
4. IF the current password is incorrect, THEN THE API SHALL return HTTP 401 and THE Admin_Dashboard SHALL display "Current password is incorrect" inside the form.
5. THE Settings page SHALL display a "Business Information" form with fields: Business Name, Phone, Address, and Logo URL.
6. WHEN an admin saves Business Information, THE Admin_Dashboard SHALL persist the values to `localStorage` under the key `business_settings` as a JSON object `{ name, phone, address, logoUrl }`.
7. THE Admin_Dashboard SHALL read Business_Settings from `localStorage` when generating Documents (Requirement 8) and when rendering the dashboard header.
8. THE Settings page SHALL use the CSS_Design_System layout classes and SHALL NOT contain inline `style` attributes.

---

### Requirement 12: UI Redesign — Consistent Design System

**User Story:** As an admin, I want the entire admin panel to have a consistent, modern appearance using the established design system, so that the interface looks professional and is easy to use on both desktop and mobile.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL use only CSS classes and variables defined in `styles-clean.css`; no HTML element SHALL carry an inline `style` attribute in the redesigned markup.
2. THE Admin_Dashboard sidebar SHALL be present and functional on all admin pages (`index.html`, `clients.html`, `invoices.html`, `documents.html`, `reports.html`, `settings.html`) with consistent navigation links and active-state highlighting.
3. WHILE the viewport width is 1024px or wider, THE Admin_Dashboard SHALL display the sidebar as a fixed left panel and the main content area to its right using the `.app-shell` flex layout.
4. WHILE the viewport width is less than 1024px, THE Admin_Dashboard SHALL hide the sidebar off-screen and display a hamburger button (`.hamburger`) in the topbar; WHEN the hamburger is clicked, THE Admin_Dashboard SHALL slide the sidebar into view using the `.sidebar.active` class.
5. THE Admin_Dashboard SHALL apply status badge classes consistently: `.badge-warning` for pending/draft, `.badge-primary` for confirmed/sent, `.badge-purple` for in-progress, `.badge-success` for completed/paid, `.badge-danger` for cancelled/overdue.
6. THE Admin_Dashboard SHALL use `.card` for all content panels, `.action-btn` for primary actions, `.compact-btn.compact-btn-outline` for secondary actions, and `.section-title` for section headings.
7. THE Admin_Dashboard topbar SHALL display the current page title and a Logout button on all pages.
8. WHEN the Admin_Dashboard displays a loading state, THE Admin_Dashboard SHALL use the `.skeleton` CSS class on placeholder elements rather than showing blank space or a spinner overlay that blocks interaction.
9. THE Admin_Dashboard SHALL support dark mode by toggling the `dark-mode` class on `<body>`, with a toggle button in the Settings page or topbar.
10. THE Admin_Dashboard SHALL meet WCAG 2.1 AA colour contrast requirements for all text rendered against the `--primary` (#00B2FF) and `--dark` (#1A1B25) backgrounds.

---

### Requirement 13: Security Hardening

**User Story:** As a system operator, I want the API to enforce authentication on all sensitive endpoints and use a strong JWT secret, so that customer and business data is protected from unauthorised access.

#### Acceptance Criteria

1. THE API `GET /api/clients` endpoint SHALL require a valid JWT (enforced by the `auth` middleware) and return HTTP 401 if no token is provided.
2. THE API `POST /api/admin/register` endpoint SHALL require a valid JWT (enforced by the `auth` middleware) and return HTTP 401 if no token is provided.
3. THE API SHALL use the `JWT_SECRET` environment variable for signing and verifying tokens; IF `JWT_SECRET` is not set in a production environment, THEN THE API SHALL refuse to start and log a fatal error.
4. THE API `POST /api/admin/login` endpoint SHALL enforce the existing rate limiter (5 attempts per 15 minutes per IP) and return HTTP 429 when the limit is exceeded.
5. THE Admin_Dashboard login form SHALL NOT display the demo credentials (`hunter / hunter_admin1234`) in the production build.
6. THE API SHALL validate all user-supplied input using `express-validator` before executing any database query on `POST` and `PUT` endpoints.

---

### Requirement 14: Backend — Dashboard Overview API Extension

**User Story:** As a developer, I want the `GET /api/dashboard/overview` endpoint to return complete booking and revenue statistics, so that the frontend can display accurate dashboard metrics without multiple separate API calls.

#### Acceptance Criteria

1. THE `GET /api/dashboard/overview` endpoint SHALL return HTTP 200 with a JSON body containing: `total_bookings` (integer), `pending_bookings` (integer), `today_revenue_tsh` (integer), `monthly_revenue_tsh` (integer), `overdue` (object with `overdue_count` and `overdue_total`), `issued` (object with `issued_count`), and `recent_bookings` (array, max 10 items).
2. THE endpoint SHALL compute `total_bookings` with `SELECT COUNT(*) FROM bookings`.
3. THE endpoint SHALL compute `pending_bookings` with `SELECT COUNT(*) FROM bookings WHERE status = 'pending'`.
4. THE endpoint SHALL compute `today_revenue_tsh` with a LEFT JOIN between `bookings` and `services` on `bookings.service = services.name` filtered to `status = 'completed'` and `DATE(bookings.created_at) = CURRENT_DATE`, summing `COALESCE(services.price, 0)`.
5. THE endpoint SHALL compute `monthly_revenue_tsh` with the same join filtered to `status = 'completed'` and the current calendar month and year, summing `COALESCE(services.price, 0)`.
6. THE endpoint SHALL compute `recent_bookings` with `SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10`.
7. IF any sub-query fails, THEN THE endpoint SHALL return HTTP 500 with `{ error: <message> }`.

---

### Requirement 15: Correctness Properties

The following properties SHALL hold for the system and SHALL be verified by property-based tests.

#### Acceptance Criteria

1. FOR ALL valid service objects `s` with `s.id` (integer), `s.name` (non-empty string), and `s.price` (positive integer): calling `PUT /api/services/:id` with `{ name: s.name, price: s.price }` followed by `GET /api/services` SHALL return a services array containing an object where `id === s.id`, `name === s.name`, and `price === s.price` (round-trip write/read property).
2. FOR ALL arrays of bookings `B` returned by `GET /api/bookings`: the count of bookings where `status === 'pending'` in `B` SHALL equal the `pending_bookings` value returned by `GET /api/dashboard/overview` (consistency invariant).
3. FOR ALL arrays of bookings `B` returned by `GET /api/bookings`: `B.length` SHALL equal the `total_bookings` value returned by `GET /api/dashboard/overview` (count invariant).
4. FOR ALL invoice objects with `items[]`: the `total_amount_tsh` field stored in the database SHALL equal `SUM(item.quantity × item.unit_price_tsh)` for all items in `items[]` (invoice total invariant).
5. FOR ALL document objects `d` saved via `POST /api/documents` and retrieved via `GET /api/documents/:id`: `d.doc_id`, `d.type`, `d.customer`, and `d.services` SHALL be identical in both the POST request body and the GET response body (document round-trip property).
6. FOR ALL status transitions applied via `PUT /api/bookings/:id`: the set of valid target statuses SHALL be `{ 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled' }`; THE API SHALL return HTTP 400 for any status value outside this set (status validation property).

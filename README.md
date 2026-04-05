# ☕ Cawfee Tawk — Cafe POS Management System

> A full-stack, production-grade Point of Sale system built from scratch for restaurants — real-time kitchen display, QR self-ordering, analytics, and staff management.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-18.x-blue?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-blue?style=flat-square&logo=postgresql)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black?style=flat-square&logo=socket.io)
![JWT](https://img.shields.io/badge/JWT-Auth-orange?style=flat-square)
![Zod](https://img.shields.io/badge/Zod-Validation-purple?style=flat-square)

---

## 🏆 Built At

**ODOO x INDUS Hackathon 2026** — Team Cracking crax daily (team leader : yug gandhi)

---

## 👥 Team

| Member | Role | Responsibilities |
|--------|------|-----------------|
| **Yug Gandhi** | Backend & Database | All 18 DB tables, 14 migrations, 13 indexes, JWT auth, Socket.io, reports engine, seed data (500+ customers, 1000+ orders), UPI QR, image storage |
| **Kush maurya** | Routes & Integrations | All 31+ Express route handlers, Zod validation on every route, pagination middleware, Socket.io kitchen integration, payment routes, customer auth |
| **Ansh agarwal** | Frontend Development | All React pages, Zustand stores, Axios interceptors, TanStack Query, POS terminal, kitchen display, admin dashboard, Recharts analytics |
| **Princy soni** | UI & Research | Neo-brutalist design system, CSS modules, UX research, wireframes, GST tax research, retention thresholds, product image curation |

---

## ✨ Features

- **Admin Dashboard** — Real-time KPIs, sales charts, peak hours heatmap, customer retention analysis
- **POS Terminal** — Floor view with table status, product grid with images, cart, send to kitchen, payment
- **Kitchen Display** — Real-time Socket.io ticket board with 3 stages (To Cook → Preparing → Completed)
- **Customer Self-Order** — QR scan → OTP phone verification → browse menu → place order from phone
- **Full Analytics** — Revenue over time, category share, staff performance, revenue by table
- **Staff & Payroll** — Shift tracking, hours worked, orders handled, payroll recording
- **Customer CRM** — Visit count, total spent, loyalty segmentation (Loyal / Occasional / New)
- **Product Management** — Image upload/URL, category, tax rates (GST 0%/5%/12%/18%/28%)
- **Input Validation** — Zod schemas on every POST/PUT/PATCH route with field-level errors
- **Pagination** — All list endpoints paginated (default 20, max 100) with meta object
- **Rate Limiting** — 20 auth requests per 15 min per IP

---

## 🛠 Tech Stack

### Backend

| Technology | Purpose |
|-----------|---------|
| Node.js + Express | HTTP API server on port 4000 |
| PostgreSQL 16 | Primary database — ACID, exact decimal arithmetic |
| Knex.js | SQL query builder, migrations, seeds |
| Socket.io | Real-time kitchen display events |
| JWT (access + refresh) | Stateless auth — no DB lookup on every request |
| bcrypt (salt 12) | Password and refresh token hashing |
| Zod | Schema validation on all routes |
| Helmet.js | 15 HTTP security headers |
| express-rate-limit | Brute force protection on auth routes |
| qrcode | UPI QR code generation as base64 PNG |
| Winston | Structured logging |

### Frontend

| Technology | Purpose |
|-----------|---------|
| React 18 + Vite | UI framework, fast HMR |
| Zustand | Global state — token in memory, never localStorage |
| TanStack Query | Server state, caching, auto-refetch (staleTime 30s) |
| React Router v6 | Protected routes, role-based navigation |
| Axios | HTTP client with Bearer interceptor + 401 refresh |
| React Hook Form + Zod | Same schemas as backend, field-level errors |
| Recharts | Bar, Line, Pie, responsive charts |
| Socket.io-client | Kitchen display real-time connection |
| CSS Modules | Scoped neo-brutalist design system |

---

## 🗄 Database Design

### 18 Tables across 14 Migrations

```
pos_configs (ROOT — no foreign keys)
├── sessions (pos_config_id, opened_by → users)
│       └── orders (session_id, table_id, customer_id, created_by)
│               ├── order_lines (order_id, product_id, variant_id)
│               │       └── kitchen_ticket_items (order_line_id)
│               ├── payments (order_id)
│               └── kitchen_tickets (order_id UNIQUE)
├── floors (pos_config_id)
│       └── tables (floor_id)
│               └── self_order_tokens (table_id, session_id)
│
users ─────────────── independent, referenced by sessions/orders/staff_payments
customers ─────────── independent, referenced by orders
product_categories ─── independent
products (category_id) → product_variants (product_id)
customer_otps ──────── phone-keyed, no FK
customer_sessions ───── customer_id → customers
staff_payments ──────── staff_id, paid_by → users, session_id → sessions
```

### 13 Performance Indexes

| Index | Column | Why |
|-------|--------|-----|
| idx_orders_session_id | orders(session_id) | Filter orders per shift |
| idx_orders_status | orders(status) | Floor view occupied table detection |
| idx_orders_created_at | orders(created_at) | Date range reports |
| idx_order_lines_order_id | order_lines(order_id) | Order detail fetch |
| idx_kitchen_tickets_status | kitchen_tickets(status) | Active ticket filter |
| idx_payments_order_id | payments(order_id) | Payment validation lookup |
| idx_payments_status | payments(status) | Confirmed payment reports |
| idx_tables_qr_token | tables(qr_token) | Self-order token lookup |
| idx_customers_phone | customers(phone) | OTP verification |
| idx_sessions_pos_config_id | sessions(pos_config_id) | Active session check |
| idx_sessions_status | sessions(status) | Open session filter |
| idx_products_category_id | products(category_id) | POS category tab filter |
| idx_products_is_active | products(is_active) | Hide inactive products |

### Key Design Decisions

- **Integer IDs** — Migrated from UUID. 4 bytes vs 16 bytes, sequential B-tree index, faster joins, human-readable
- **Price snapshotting** — `order_lines.unit_price` stores price at order time. Menu price changes never affect historical orders
- **recalcOrder()** — Every line change recalculates entire order total from scratch. Never incremental — prevents rounding drift
- **pos_configs has no FKs** — Root entity. Adding FK to sessions creates circular dependency (sessions → pos_configs → sessions)
- **last_session_id not a FK** — Denormalized convenience field. Avoids circular constraint. Updated manually after session opens

---

## 🔐 Authentication Flow

```
POST /api/auth/login
│
├── Zod validate: email format, password not empty
├── SELECT user WHERE email=X AND is_active=true
├── bcrypt.compare(password, hash) → true/false
├── jwt.sign({ id, email, role, name }, ACCESS_SECRET, { expiresIn: "24h" })
├── jwt.sign({ id }, REFRESH_SECRET, { expiresIn: "7d" })
├── bcrypt.hash(refreshToken) → store in users.refresh_token_hash
├── res.cookie("refreshToken", rawToken, { httpOnly: true, secure: true })
└── Return: { accessToken, user: { id, name, email, role } }

Frontend:
├── Zustand stores accessToken in MEMORY ONLY (never localStorage)
├── Axios interceptor adds: Authorization: Bearer {accessToken}
└── On 401: POST /refresh with cookie → new token → retry original request
```

### Role-Based Access

| Role | Access |
|------|--------|
| `admin` | Everything — dashboard, reports, staff, products, all config |
| `staff` | POS terminal, open/close sessions, orders, payments |
| `kitchen` | Kitchen display only — view and update ticket status |

---

## 🖥 POS Terminal Workflow

```
Open Session
  Staff → /pos-select → click terminal → POST /sessions/open
  Zustand: setSession() + setPosConfig()

Floor View
  GET /tables + GET /orders?session_id=X&status=draft
  Occupied tables = tables with active draft orders
  Click free table  → POST /orders (order_number = MAX+1 per session)
  Click occupied    → resume existing draft order

Build Order (Register Tab)
  GET /products?is_active=true → product grid with images + category tabs
  Click product → POST /orders/:id/lines { product_id, quantity: 1 }
  service.addLine():
    Snapshot product price at this moment
    INSERT order_line with unit_price, tax_percent, subtotal, total
    recalcOrder() — SUM all lines from scratch → UPDATE order totals

Send to Kitchen
  POST /kitchen/send/:order_id
  INSERT kitchen_ticket + kitchen_ticket_items (snapshot product names)
  io.to("kitchen_" + session_id).emit("new_ticket", ticketWithItems)
  UNIQUE on order_id prevents duplicate tickets

Process Payment
  POST /payments { order_id, method, amount }
  Cash/Digital → immediate POST /payments/:id/validate
  UPI → GET /payments/upi-qr/:order_id → show QR → customer scans → validate
  On validate: order.status = "paid", customer.total_sales += amount
  Success screen (black bg, yellow amount) → 3s auto-dismiss → floor view

Close Session
  POST /sessions/:id/close { closing_cash }
  hours = EXTRACT(EPOCH FROM closed_at - opened_at) / 3600
  posStore.clearPos() → navigate to /pos-select
```

---

## 🍳 Kitchen Display Workflow

```
Socket.io Rooms: kitchen_{session_id}
Kitchen joins: socket.emit("join_kitchen", session_id)
Server:        socket.join("kitchen_" + session_id)
```

### 3-Column Ticket Board

| Column | Status | Background |
|--------|--------|------------|
| TO COOK | `to_cook` | White |
| PREPARING | `preparing` | Amber tint (#fef3c7) |
| COMPLETED | `completed` | Green tint (#dcfce7) |

### Real-Time Socket Events

| Event | Direction | Payload | Effect |
|-------|-----------|---------|--------|
| `new_ticket` | Server → Kitchen | Full ticket + items array | New card in TO COOK column |
| `ticket_updated` | Server → Kitchen | `{ id, status }` | Card moves to new column |
| `item_prepared` | Server → Kitchen | `{ id, ticket_id, is_prepared }` | Item strikethrough |
| `join_kitchen` | Kitchen → Server | session_id | Server adds socket to room |

### Stage Progression

```
Click ticket → PATCH /kitchen/tickets/:id/status { status: "preparing" }
  → UPDATE kitchen_tickets.status
  → io.emit("ticket_updated") → all displays update instantly

Click item   → PATCH /kitchen/items/:id/prepare
  → TOGGLE kitchen_ticket_items.is_prepared
  → io.emit("item_prepared") → strikethrough on all screens
```

---

## 💳 Payment Flow

```
Step 1: POST /payments { order_id, method, amount }
  ├── Validates method is enabled in this pos_config
  ├── Validates amount === order.total exactly
  └── INSERT payments (status: "pending")

Step 2A — Cash or Digital:
  └── POST /payments/:id/validate immediately

Step 2B — UPI:
  ├── GET /payments/upi-qr/:order_id
  ├── Build: upi://pay?pa=ID&pn=NAME&am=AMOUNT&cu=INR
  ├── qrcode.toDataURL() → base64 PNG → show QR modal
  ├── Customer scans with banking app
  └── POST /payments/:id/validate

On validate:
  ├── UPDATE payments SET status = "confirmed"
  ├── UPDATE orders SET status = "paid"
  └── UPDATE customers SET total_sales += amount, visit_count++
```

---

## 📊 Analytics Engine

| Report | SQL Technique | Output |
|--------|---------------|--------|
| Dashboard KPIs | COUNT, SUM, AVG + prev period comparison | Total orders, revenue, avg, % change |
| Revenue Over Time | GROUP BY date/hour, SUM(total) | Bar chart |
| Category Share | JOIN categories, SUM + percent | Pie chart with table |
| Peak Hours Heatmap | EXTRACT(DOW) × EXTRACT(HOUR), COUNT | 7×15 grid, color-coded |
| Customer Retention | visit_count >= 5 / 2-4 / 1 segments | Donut chart with % |
| Staff Performance | LEFT JOIN sessions + orders per user | Bar chart + table |
| Revenue by Table | GROUP BY table_id, SUM total | Bar chart |
| Payment Breakdown | GROUP BY method, COUNT + SUM | Cash/Digital/UPI split |

### Peak Hours Heatmap SQL

```sql
SELECT
  EXTRACT(DOW FROM orders.created_at) AS day_of_week,
  EXTRACT(HOUR FROM orders.created_at) AS hour,
  COUNT(*) AS order_count,
  COALESCE(SUM(orders.total), 0) AS revenue
FROM orders
LEFT JOIN sessions ON orders.session_id = sessions.id
WHERE orders.status = 'paid'
GROUP BY day_of_week, hour
ORDER BY day_of_week, hour;
```

---

## 📱 Customer Self-Order Flow

```
Admin generates QR
  POST /tables/:id/generate-token { session_id }
  → randomBytes(24).hex = 48-char unique token
  → INSERT self_order_tokens + UPDATE tables.qr_token
  → URL: /s/{token} printed on physical QR sticker

Customer scans → GET /self-order/{token} (no auth)
  → Lookup WHERE token=X AND is_active=true
  → Returns: cafe name, table number, full menu with images

OTP Verification
  POST /customer-auth/send-otp { phone }
  → DELETE old OTPs for this phone
  → Generate 6-digit OTP, expires in 5 minutes

  POST /customer-auth/verify-otp { phone, otp }
  → SELECT/INSERT customer → visit_count++
  → INSERT customer_sessions (64-char token, 24h expiry)
  → Return { customer, auth_token }

Place Order
  POST /self-order/{token}/order { customer_token, items[] }
  → Verify customer_token against customer_sessions
  → Find/create draft order for this table
  → INSERT order_lines, recalcOrder()
  → Order appears in cashier POS terminal immediately
```

---

## ✅ Validation Architecture

### Middleware Chain

```
Request
→ rateLimiter (20 req/15min on auth routes)
→ helmet() (15 security headers)
→ cors() (FRONTEND_URL only)
→ express.json() (parse body)
→ requireAuth (jwt.verify — no DB lookup)
→ requireRole('admin') (check req.user.role)
→ validate(schema) (Zod on req.body)
→ validateQuery(schema) (Zod on req.query)
→ Route Handler
→ errorHandler (ZodError→400, JWT→401, PG unique→409, else→500)
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    { "field": "name", "message": "Product name required" },
    { "field": "price", "message": "Price must be positive" },
    { "field": "tax_percent", "message": "Too big: expected number to be <=100" }
  ]
}
```

### Pagination Response

```json
{
  "success": true,
  "data": ["...20 records..."],
  "meta": {
    "total": 347,
    "page": 2,
    "limit": 20,
    "pages": 18,
    "showing": 20
  }
}
```

---

## 📡 API Reference

**Base URL:** `http://localhost:4000/api`

All protected routes require: `Authorization: Bearer {accessToken}`

### Auth

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /auth/signup | Public | Create account |
| POST | /auth/login | Public | Login, get JWT |
| POST | /auth/logout | Auth | Clear tokens |
| POST | /auth/refresh | Cookie | New access token |

### Sessions & Floors

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /pos-configs | Auth | List terminals |
| POST | /sessions/open | Auth | Start shift |
| POST | /sessions/:id/close | Auth | End shift |
| GET | /sessions/active/:config_id | Auth | Active session |
| GET | /floors | Auth | All floors |
| POST | /floors | Admin | Create floor |
| GET | /tables | Auth | All tables |
| POST | /tables | Admin | Create table |
| PATCH | /tables/:id/toggle | Admin | Toggle active |
| POST | /tables/:id/generate-token | Auth | Generate QR |

### Menu

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /categories | Auth | All categories |
| POST | /categories | Admin | Create category |
| DELETE | /categories/:id | Admin | Delete category |
| GET | /products?page=1&limit=20 | Auth | Paginated products |
| POST | /products | Admin | Create with image |
| PUT | /products/:id | Admin | Edit product |
| PATCH | /products/:id/toggle | Admin | Toggle active |

### Orders

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /orders?page=1&limit=20 | Auth | Paginated orders |
| GET | /orders/:id | Auth | Detail with lines |
| POST | /orders | Auth | Create draft |
| POST | /orders/:id/lines | Auth | Add item |
| PUT | /orders/:id/lines/:line_id | Auth | Update qty |
| DELETE | /orders/:id/lines/:line_id | Auth | Remove item |

### Payments

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /payments?page=1&limit=20 | Auth | Paginated payments |
| POST | /payments | Auth | Create pending |
| POST | /payments/:id/validate | Auth | Confirm payment |
| GET | /payments/upi-qr/:order_id | Auth | Generate UPI QR |

### Kitchen

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /kitchen/tickets?session_id=X | Auth | Load tickets |
| POST | /kitchen/send/:order_id | Auth | Send to kitchen |
| PATCH | /kitchen/tickets/:id/status | Auth | Move stage |
| PATCH | /kitchen/items/:id/prepare | Auth | Toggle item done |

### Reports & Staff

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /reports/dashboard?period=weekly | Admin | KPI summary |
| GET | /reports/sales-chart?period=weekly | Admin | Revenue chart |
| GET | /reports/top-products?period=weekly | Admin | Top products |
| GET | /reports/top-categories?period=weekly | Admin | Category share |
| GET | /reports/hourly-heatmap | Admin | Peak hours grid |
| GET | /reports/customer-retention | Admin | Loyalty segments |
| GET | /reports/staff-performance | Admin | Staff metrics |
| GET | /reports/table-revenue | Admin | Revenue by table |
| GET | /staff/summary | Admin | Staff overview |
| GET | /staff/shifts | Admin | Shift history |
| POST | /staff/pay | Admin | Record payment |

### Customers & Self-Order

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /customers?page=1&limit=20 | Auth | Paginated customers |
| POST | /customers | Auth | Create customer |
| POST | /customer-auth/send-otp | Public | Send OTP |
| POST | /customer-auth/verify-otp | Public | Verify OTP |
| GET | /self-order/:token | Public | Get menu |
| POST | /self-order/:token/order | CustomerToken | Place order |

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- Git + Git Bash (Windows)

### 1. Clone

```bash
git clone https://github.com/yuggandhii/cafe-management-system.git
cd cafe-management-system
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Set DB_PASSWORD in .env
npm install
```

### 3. Database

```bash
psql -U postgres -c "CREATE DATABASE pos_cafe;"
npm run migrate
npm run seed
```

### 4. Start Backend

```bash
npm run dev
# http://localhost:4000
```

### 5. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
# http://localhost:5173
```

### Environment Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| PORT | 4000 | Backend port |
| DB_HOST | localhost | PostgreSQL host |
| DB_NAME | pos_cafe | Database name |
| DB_USER | postgres | DB user |
| DB_PASSWORD | yourpassword | DB password |
| JWT_ACCESS_SECRET | long_random_string | Access token key |
| JWT_REFRESH_SECRET | different_random_string | Refresh token key |
| JWT_ACCESS_EXPIRES | 24h | Token lifetime |
| JWT_REFRESH_EXPIRES | 7d | Refresh lifetime |
| FRONTEND_URL | http://localhost:5173 | CORS whitelist |
| UPI_ID | 9876543210@ybl | UPI QR generation |

---

## 🔑 Demo Credentials

Click any role button on the login page to auto-fill.

| Role | Email | Password | Interface |
|------|-------|----------|-----------|
| Admin | admin@pos-cafe.com | Admin@1234 | /dashboard |
| Staff | raj@pos-cafe.com | Staff@1234 | /pos-select |
| Staff 2 | priya@pos-cafe.com | Staff@1234 | /pos-select |
| Kitchen | arjun@pos-cafe.com | Kitchen@1234 | /kitchen-select |

---

## 📁 Project Structure

```
cafe-management-system/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            JWT, bcrypt, refresh tokens
│   │   │   ├── pos-configs/     Terminal configuration
│   │   │   ├── sessions/        Shift management
│   │   │   ├── floors/          Floor layout
│   │   │   ├── tables/          Tables + QR token generation
│   │   │   ├── categories/      Product categories
│   │   │   ├── products/        Products + images + variants
│   │   │   ├── customers/       CRM + visit tracking
│   │   │   ├── orders/          Order lifecycle + recalcOrder()
│   │   │   ├── payments/        Two-step payment + UPI QR
│   │   │   ├── kitchen/         Tickets + Socket.io events
│   │   │   ├── reports/         Full analytics engine
│   │   │   ├── staff/           Shifts + payroll
│   │   │   ├── self-order/      Public QR-based ordering
│   │   │   ├── customer-auth/   OTP phone verification
│   │   │   └── validation/      Central Zod schemas
│   │   ├── middleware/
│   │   │   ├── auth.js          requireAuth, requireRole
│   │   │   ├── validate.js      validate(), validateQuery()
│   │   │   └── errorHandler.js  Global error handler
│   │   ├── db/
│   │   │   ├── migrations/      14 migration files
│   │   │   └── seeds/           500+ customers, 1000+ orders
│   │   └── utils/
│   │       ├── response.js      ok(), paginated(), created()
│   │       └── logger.js        Winston structured logs
│   └── knexfile.js
└── frontend/
    └── src/
        ├── pages/
        │   ├── auth/            Login (demo creds), Signup
        │   ├── admin/           Dashboard + all admin pages
        │   ├── pos/             PosSelect, POSTerminal
        │   └── kitchen/         KitchenDisplay
        ├── store/
        │   ├── authStore.js     user, accessToken in memory
        │   └── posStore.js      session, config, table, order
        ├── api/
        │   └── axios.js         Bearer interceptor + 401 refresh
        └── socket.js            Socket.io client + joinKitchen()
```

---

## 🌿 Git Workflow

```
main       ← production ready, final submission
develop    ← integration branch
feature/*  ← individual features merged into develop
```

**Commit convention:** `feat:` `fix:` `chore:` `docs:` `refactor:` `db:`

---

## 🔒 Security Highlights

| Measure | Implementation | Protects Against |
|---------|---------------|-----------------|
| Password hashing | bcrypt salt 12, never stored plain | Database breach |
| Access token in memory | Zustand only, never localStorage | XSS token theft |
| Refresh as httpOnly cookie | JS cannot read it | XSS cookie theft |
| Refresh hash in DB | bcrypt hash stored, not raw token | DB breach |
| Rate limiting | 20 req/15min per IP on auth routes | Brute force |
| Helmet.js | 15 security headers | Clickjacking, MIME sniff |
| CORS restriction | FRONTEND_URL only | Cross-origin attacks |
| Zod validation | All inputs validated before service | Type confusion, oversized input |
| Knex parameterization | No string interpolation | SQL injection |
| requireRole middleware | Per-route role enforcement | Privilege escalation |
| OTP security | 5min expiry, single-use, previous deleted | Replay attacks |
| Enum constraints | DB-level enum on role/status/method | Data corruption |

---

## 🌱 Seed Data

| Data | Count | Purpose |
|------|-------|---------|
| Products | 160+ | Realistic menu across 6 categories |
| Customers | 500+ | Pagination demo (25 pages at limit 20) |
| Orders | 1000+ | 6 months of history for heatmap and reports |
| Sessions | 180+ | Daily sessions across 6 months |
| Payments | 1000+ | Cash/Digital/UPI breakdown |

---

*Built with ☕ by Team Cracking crax daily — Odoo x Indus hackathon 2026*

*Yug Gandhi (Backend & DB) · Kush Maurya (Routes & Integrations) · Ansh (Frontend) · Princy (UI & Research)*

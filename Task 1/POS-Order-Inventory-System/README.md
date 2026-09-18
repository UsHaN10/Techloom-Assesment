# 🛒 PayCart POS & Inventory Management System

A full-stack, real-time **Point of Sale (POS) and Inventory Management System** built with React, Vite, Ant Design, Express.js, and **PostgreSQL**. Ready for production deployment on **Railway**.

Designed with Role-Based Access Control (RBAC), atomic 2-phase stock reservation with automatic timeout rollbacks, order lifecycle management, administrative user control, and transactional database integrity.

---

## 🔑 Default Admin Credentials

When the backend server starts, it automatically initializes a default administrator account in PostgreSQL if one does not already exist:

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| **Email** | `admin@paycart.com` | Configurable via `DEFAULT_ADMIN_EMAIL` |
| **Password** | `admin123` | Configurable via `DEFAULT_ADMIN_PASSWORD` |
| **Role** | `ADMIN` | Has full access to all system modules |

> **Security Tip**: In a production environment (such as Railway), override the default credentials by defining `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in your environment variables, and set a strong `JWT_SECRET`.

---

## 💻 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) (`react`, `react-dom`)
- **Build Tool & Dev Server**: [Vite 8](https://vite.dev/)
- **UI Component Library**: [Ant Design (antd 6.x)](https://ant.design/)
- **Icons**: [@ant-design/icons](https://ant.design/components/icon) & [Lucide React](https://lucide.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/) (`react-router-dom`)
- **HTTP Client**: [Axios](https://axios-http.com/) (configured with Bearer token interceptors & auto-logout on 401)
- **Styling**: Modern Glassmorphism theme via Ant Design `ConfigProvider` + CSS token styling
- **Linter**: [Oxlint](https://oxc.rs/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Web Framework**: [Express.js 5.x](https://expressjs.com/)
- **Database Driver**: [node-postgres (`pg`)](https://node-postgres.com/) with connection pooling and SSL support
- **Authentication**: [JSON Web Tokens (jsonwebtoken)](https://jwt.io/) (8-hour session tokens)
- **Password Security**: [bcryptjs](https://www.npmjs.com/package/bcryptjs) (Salt rounds: 10)
- **Cross-Origin Handling**: [CORS](https://www.npmjs.com/package/cors)
- **Environment Management**: [dotenv](https://www.npmjs.com/package/dotenv)
- **Process & Concurrency**: [concurrently](https://www.npmjs.com/package/concurrently) for dev, `node backend/server.js` for production

### Database
- **Engine**: [PostgreSQL](https://www.postgresql.org/) (native Railway PostgreSQL supported)
- **Features**:
  - Auto-initializes schema on startup: `users`, `products`, `orders` tables.
  - Auto-seeds default hardware catalog & default admin user.
  - Atomic stock reservations with row-level locks (`SELECT ... FOR UPDATE`).
  - Automatic background reservation expiry worker.

---

## 👥 Role-Based Access Control (RBAC)

The application supports three distinct user roles with dedicated routing, views, and server-side authorization guards:

```mermaid
graph TD
    User([User Logs In]) --> AuthCheck{Check Role}
    AuthCheck -->|ADMIN| AdminDashboard[Full System Access: Users, POS, Inventory, Orders]
    AuthCheck -->|CASHIER| CashierTerminal[POS Terminal: Cart, Checkout & Payment]
    AuthCheck -->|STAFF| StaffDashboard[Inventory & Orders Lifecycle]
```

### 1. `ADMIN` (Administrator)
- **Full System Access**: User Management, POS Terminal, Inventory Dashboard, and Orders Lifecycle.
- **User Administration**:
  - View all registered staff and cashiers.
  - Create new `STAFF` and `CASHIER` accounts.
  - Edit user details (name, email, role).
  - Activate or deactivate accounts.
  - Reset user passwords.
  - Delete user accounts.
- **Admin Safeguards**: Built-in protection prevents deleting, deactivating, or demoting the last active `ADMIN`.

### 2. `CASHIER` (Point of Sale Operator)
- **Direct Route**: `/pos`
- Browse product catalog with real-time stock availability.
- Manage shopping cart (increment, decrement, remove).
- Initiate checkout with **Stock Reservation**.
- Simulate payment resolutions: **Success** (`Paid`), **Failure** (`Failed`), or **Timeout** (`Expired`).

### 3. `STAFF` (Inventory & Order Supervisor)
- **Direct Route**: `/dashboard`
- **Inventory Management**:
  - View live catalog prices and remaining stock.
  - Add new products to the catalog.
  - Edit existing product names, prices, and stock quantities.
  - Delete products from the inventory.
- **Orders Lifecycle Management**:
  - Track all customer orders and transaction history.
  - Filter and inspect order details (items, quantity, timestamp, status tags).
  - Cancel orders (restores items back to stock).

---

## ⚡ Key System Capabilities

### 1. PostgreSQL Atomic Stock Reservation & Expiry
To eliminate overselling and race conditions during concurrent checkouts:
1. **Checkout Initiation**: When items are checked out, a PostgreSQL transaction begins with `SELECT ... FOR UPDATE` row-level locks. The system atomically reserves stock in `products` and creates a `Reserved` order.
2. **5-Minute Reservation Window**: An expiration timestamp is recorded (`NOW() + INTERVAL '5 minutes'`).
3. **Background Expiry Worker**: Every 30 seconds, a background worker queries overdue `Reserved` orders, marks them `Expired`, and releases the reserved stock back to available inventory.
4. **Order Cancellation**: If an order is cancelled:
   - For `Reserved` orders: Reserved stock is released.
   - For `Paid` orders: Items are refunded back into the available stock pool.

### 2. Glassmorphic UI & Real-Time Alerts
- Translucent frosted glass effect (`backdrop-filter: blur(15px)`).
- Instant UI notifications and feedback banners powered by Ant Design `message`.
- Status color coding:
  - 🟢 `Paid`: Green
  - 🟡 `Pending`: Gold
  - 🔵 `Reserved`: Blue
  - 🟠 `Expired`: Warning / Orange
  - 🔴 `Failed`: Red
  - ⚪ `Cancelled`: Default / Gray

---

## 📡 REST API Reference

All protected endpoints require the HTTP header:
`Authorization: Bearer <JWT_TOKEN>`

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user email and password; returns JWT token & user payload |

### User Management (`/api/users`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | `ADMIN` | Retrieve list of all users (passwords excluded) |
| `GET` | `/api/users/:id` | `ADMIN` | Get user details by ID |
| `POST` | `/api/users` | `ADMIN` | Create a new user (`CASHIER` or `STAFF`) |
| `PUT` | `/api/users/:id` | `ADMIN` | Update user details (name, email, role, status) |
| `PATCH` | `/api/users/:id/status` | `ADMIN` | Toggle user active/inactive status |
| `PATCH` | `/api/users/:id/password` | `ADMIN` | Reset a user's password |
| `DELETE` | `/api/users/:id` | `ADMIN` | Delete a user (guarded against deleting last admin) |

### Products & Inventory (`/api/products`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | `ADMIN`, `CASHIER`, `STAFF` | Fetch all products with computed available stock |
| `POST` | `/api/products` | `ADMIN`, `STAFF` | Create a new inventory product |
| `PUT` | `/api/products/:id` | `ADMIN`, `STAFF` | Update product details (name, price, stock) |
| `DELETE` | `/api/products/:id` | `ADMIN`, `STAFF` | Remove a product from inventory |

### Orders & Transactions (`/api/orders`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders/checkout` | `ADMIN`, `CASHIER` | Create order, atomically reserve stock with row lock |
| `POST` | `/api/orders/:id/payment`| `ADMIN`, `CASHIER` | Process payment outcome (`success`, `failure`, `timeout`) |
| `POST` | `/api/orders/:id/cancel` | `ADMIN`, `CASHIER`, `STAFF` | Cancel order and roll back stock |
| `GET` | `/api/orders` | `ADMIN`, `STAFF` | Fetch full order history sorted newest first |

---

## 🚂 Railway Deployment Guide (Step-by-Step)

The project is structured for a **unified single-service deployment** on [Railway](https://railway.app/). In production, Express automatically serves the compiled Vite frontend (`dist/`) and routes all `/api` traffic, reducing your hosting cost to a single web service and a PostgreSQL database.

### Step 1: Create a Railway Account & Project
1. Go to [railway.app](https://railway.app/) and log in with GitHub.
2. Click **"New Project"**.

### Step 2: Provision PostgreSQL Database
1. In your Railway project, click **"+ Create"** or **"New"** -> **"Database"** -> **"Add PostgreSQL"**.
2. Railway will spin up a managed PostgreSQL database.

### Step 3: Deploy the Repository
1. Click **"+ Create"** -> **"GitHub Repo"**.
2. Select your repository (`POS-Inventory-System`).
3. Railway automatically detects `railway.json` and `package.json`, runs `npm install`, executes `npm run build`, and starts the service with `npm start`.

### Step 4: Configure Environment Variables
In your Railway web service settings (under the **Variables** tab):
1. Add `DATABASE_URL`:
   - Click **"Add Variable"** -> **"Reference Variable"** -> Select your PostgreSQL service's `DATABASE_URL` (or paste the connection string).
2. Add `JWT_SECRET`:
   - Enter a long, secure random string (e.g. `secret_jwt_token_key_2026_railway`).
3. (Optional) Customize Admin credentials:
   - `DEFAULT_ADMIN_EMAIL=admin@paycart.com`
   - `DEFAULT_ADMIN_PASSWORD=admin123`

### Step 5: Generate Domain
1. In your Web Service under **Settings** -> **Networking**, click **"Generate Domain"**.
2. Open the generated domain in your browser!
3. The database tables and default products will be created automatically on the first run.
4. Log in using your admin credentials (`admin@paycart.com` / `admin123`).

---

## 💻 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) running locally or a remote connection string

### 1. Clone & Install
```bash
git clone https://github.com/UsHaN10/POS-Inventory-System.git
cd POS-Inventory-System
npm install
```

### 2. Configure `.env`
Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos-system
JWT_SECRET=supersecretjwtkey_paycart_2026
DEFAULT_ADMIN_EMAIL=admin@paycart.com
DEFAULT_ADMIN_PASSWORD=admin123
```

### 3. Run Development Server
```bash
npm run dev
```
- Vite dev server runs at: `http://localhost:5173`
- Express API server runs at: `http://localhost:5000`
- API calls from Vite to `/api` are automatically proxied to port 5000 via `vite.config.js`.

---

## 📁 Project Structure

```text
POS-Inventory-System/
├── backend/
│   ├── config/
│   │   ├── postgres.js           # PostgreSQL pool, schema init, auto-seeding & worker
│   │   └── db.js                 # Legacy MongoDB in-memory connection
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification & role authorization
│   ├── models/
│   │   ├── mockDb.js             # Initial mock reference data
│   │   ├── Order.js              # Order schema definition
│   │   └── Product.js            # Product schema definition
│   ├── routes/
│   │   ├── authRoutes.js         # Authentication routes (login via PostgreSQL)
│   │   ├── orderRoutes.js        # Transactional checkout, payment simulation, cancel
│   │   ├── productRoutes.js      # Product CRUD routes (PostgreSQL)
│   │   └── userRoutes.js         # Admin user management & password reset (PostgreSQL)
│   ├── package.json              # Backend dependencies (with pg)
│   └── server.js                 # Express server, static UI hosting & worker setup
├── src/
│   ├── assets/                   # Static media and images
│   ├── components/
│   │   ├── Inventory.jsx         # Product inventory management table & modal
│   │   ├── Login.jsx             # User login portal
│   │   ├── Orders.jsx            # Order history, status tags & cancellation
│   │   ├── POS.jsx               # Cashier terminal, catalog & checkout modal
│   │   ├── ProtectedRoute.jsx    # React Router role-based route protection
│   │   └── UserManagement.jsx    # Admin CRUD for staff & cashiers
│   ├── App.css                   # Global styling
│   ├── App.jsx                   # Layout, router navigation & role dashboards
│   ├── index.css                 # Base resets and styling
│   ├── main.jsx                  # Application entry point
│   └── store.jsx                 # Context API store with Axios interceptors & dynamic API_URL
├── .env                          # Local environment variables
├── index.html                    # HTML shell
├── package.json                  # Root dependencies, scripts (build, start, dev)
├── Procfile                      # Railway process file
├── railway.json                  # Railway build and deployment configuration
├── vite.config.js                # Vite build and proxy configuration
└── README.md                     # Project documentation & Railway deployment guide
```

---

## 🛠 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server and Express backend concurrently |
| `npm run build` | Compiles the React production bundle into `dist/` |
| `npm start` | Starts the Express production server (serves static UI + API) |
| `npm run preview` | Locally previews the production build |
| `npm run lint` | Runs Oxlint to inspect codebase quality |

---

## 📄 License
This project is for educational and evaluation purposes. All rights reserved.

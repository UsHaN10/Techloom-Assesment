Deployement Link : 
[](e-commerce-checkout-payment-system-production-24eb.up.railway.app)


# PayCart POS & Inventory System

A modern, full-stack Point-of-Sale (POS) and inventory management application designed with a sleek neon-minimalist UI. Built to streamline retail operations with robust authentication, role-based access control (RBAC), and real-time safe stock management powered by **PostgreSQL**.

## 🚀 Features

### Core Functionality
- **Inventory Management:** Full CRUD operations for products with concurrency-safe stock handling.
- **Sales & Point of Sale:** Clean and efficient cart system for processing transactions.
- **Role-Based Access Control (RBAC):** Distinct permissions for Admins, Cashiers, and Staff members.
- **User Management:** Secure admin interface for creating, editing, and managing employee accounts.
- **Order Timeout & Reservation:** Automatic background expiration job and stock restoration for unpaid/expired reservations.

### Technical Highlights
- **Database:** **PostgreSQL** with ACID-compliant transactions and atomic stock updates.
- **Authentication:** Secure backend JWT-based auth with React Router route protection on the frontend.
- **Modern User Interface:** Highly tailored Ant Design components fused with custom neon-minimalist aesthetics.
- **State Management:** Fast, lightweight global state using Zustand.
- **Zero-Config Local Development:** Includes an automatic in-memory PostgreSQL emulator (`pg-mem`) so you can run and test locally immediately without setting up an external PostgreSQL instance.
- **Railway Ready:** Pre-configured for seamless, one-click full-stack deployment on Railway.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18, Vite, TypeScript
- **Routing:** React Router v7
- **State Management:** Zustand
- **Styling / UI Services:**
  - Ant Design & Ant Design Icons
  - Lucide React
- **Network Requests:** Axios

### Backend
- **Environment:** Node.js (ES Modules), Express.js
- **Database:** **PostgreSQL** (`pg`) with automatic table creation, indexing, and data seeding
- **Local Fallback:** `pg-mem` (in-memory PostgreSQL emulator)
- **Security & Validation:**
  - JWT (JSON Web Tokens) for sessions
  - BcryptJS for password hashing
  - CORS configurations

---

## 📂 Project Structure

```text
├── backend/                  # Node/Express Backend Core
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js         # PostgreSQL connection pool, SSL & schema init
│   │   ├── middleware/       # JWT Auth and RBAC middleware
│   │   ├── models/           # PostgreSQL models (User, Product, Order)
│   │   ├── routes/           # Express API routes (auth, users, products, orders, payments)
│   │   └── server.js         # Backend server & background reservation job
│   ├── package.json
│   └── test.js               # PostgreSQL quick verification test
│
├── frontend/                 # React/Vite Frontend Core
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # View pages (Storefront, Cart/Checkout, History, Admin)
│   │   ├── services/         # Axios API clients
│   │   ├── store/            # Zustand state setup
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── railway.json              # Railway deployment configuration
├── package.json              # Monorepo build & start orchestration
└── README.md                 # Project Documentation
```

---

## ⚙️ Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+ recommended)
- `npm`

### Quick Start (In-Memory PostgreSQL)
You can run the project locally without installing PostgreSQL. An in-memory PostgreSQL emulator (`pg-mem`) will be used automatically.

1. **Install Dependencies:**
   ```bash
   npm run postinstall
   ```

2. **Run the Backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Run the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

### Using a Local PostgreSQL Database (Optional)
If you have a local PostgreSQL instance running:
1. Create a database (e.g. `pos_db`).
2. In `backend/.env`, set:
   ```env
   DATABASE_URL=postgres://postgres:password@localhost:5432/pos_db
   PORT=3000
   JWT_SECRET=your_super_secret_jwt_key
   ```
3. Start the backend. All tables (`users`, `products`, `orders`) and initial seed data will be created automatically.

---

## 🔑 Default Credentials
Upon the first startup, the application automatically seeds a default administrator account into the database:
- **Email:** `admin@paycart.com`
- **Password:** `password123`
- **Role:** `ADMIN`

---

## ☁️ Deploying to Railway

The project is pre-configured with a monorepo structure and `railway.json` for one-click deployment on Railway.

### Step-by-Step Deployment:

1. **Push your code to GitHub.**
2. **Log into [Railway.app](https://railway.app).**
3. Click **"New Project"** -> **"Deploy from GitHub repo"** and select this repository.
4. **Add PostgreSQL Database:**
   - In your Railway project canvas, click **"+ New"** -> **"Database"** -> **"Add PostgreSQL"**.
5. **Connect Database to Web Service:**
   - Click on your application service -> go to **"Variables"**.
   - Click **"New Variable"** -> **"Add Reference"** -> Select `DATABASE_URL` from the PostgreSQL service.
     *(Railway will automatically link `DATABASE_URL`)*.
6. **Set Optional Environment Variables (in Web Service):**
   - `JWT_SECRET`: Any random string (e.g. `pos_super_secure_jwt_token_2026`).
   - `DEFAULT_ADMIN_EMAIL`: (optional, defaults to `admin@paycart.com`).
   - `DEFAULT_ADMIN_PASSWORD`: (optional, defaults to `password123`).
7. **Generate Public Domain:**
   - Go to your application service -> **"Settings"** -> **"Networking"** -> Click **"Generate Domain"**.
8. **Deploy!**
   - Railway will automatically:
     1. Run `npm install` (and `postinstall` to install backend & frontend dependencies).
     2. Run `npm run build` (builds the React Vite frontend into `frontend/dist`).
     3. Run `npm start` (starts the Node backend, connects to PostgreSQL, creates tables, seeds initial data, and serves the fullstack application).

# S R Associates — Construction Management Platform

A professional, full-stack construction management dashboard built for **S R Associates Engineers & Contractors**. The platform provides real-time visibility into project progress, workforce, materials, budgets, and financial reporting — all in one place.

---

## ✨ Features

### 🏗️ Projects
- Create and manage multiple construction projects with metadata (type, client, budget, address, timeline)
- Project cards with image covers, status pills, and progress bars
- Filter by status: All, In Progress, Planning, Delayed, Completed
- Per-project detail view with tabs: Overview, Daily Logs, Inventory, Blueprints, Documents

### 📋 Daily Logs
- Log daily site activities, weather conditions, and workforce distribution
- Searchable log history per project with date filtering

### 📦 Inventory & Materials
- Track inflow, outflow, and balance for each material (Cement, Steel, Bricks, etc.)
- Log deliveries with supplier info, cost, and Cloudinary photo uploads (challans, stack photos)
- Material delivery costs automatically feed into the budget burn-rate calculation

### 👷 Personnel
- Add, edit, and remove team members with roles (Architect, Civil Engineer, Site Supervisor, etc.)
- Status tracking: On Site, Remote, Off Duty, On Leave (with return date)
- Clickable status popover for inline status updates

### 💰 Budget & Expenses
- Per-project budget overview with burn-rate ring chart
- Expense tracking by category: Vendor, Labor, Equipment, Material, Miscellaneous, Extension
- Approval workflow: Pending → Approved / Rejected
- Spend-by-category breakdown charts

### 📊 Reports — Generation Engine
Three-format export engine (PDF, Excel `.xlsx`, CSV) covering four report types:

| Report Type | PDF | Excel | CSV |
|---|---|---|---|
| **Daily Progress** | ✅ | ✅ | ✅ |
| **Inventory** | ✅ | ✅ | ✅ |
| **Financial Summary** | ✅ Cost Breakdown by Category | ✅ 3-sheet workbook | ✅ |
| **Personnel Attendance** | ✅ | ✅ | ✅ |

**Financial Summary** includes:
- Cost breakdown per project: Inventory, Labour, Vendor, Equipment, Material, Misc, Extension
- Expense detail list sorted newest-first with colour-coded categories & statuses
- Excel sheets: *Cost Breakdown*, *Expense Details*, *Inventory Costs*

**Report History** — generated reports saved to local history with re-download support  
**Document Vault** — upload and archive project documents (PDFs, images)

### 🗺️ Blueprints & Annotations
- Upload and view blueprints in a masonry grid
- Drop interactive pins directly onto blueprint images with status (Open / Resolved)
- Securely download original files

### ⚙️ Settings
- Upload and update company logo (syncs across sidebar, reports, and exports)
- Edit company name, license number, and address
- Notification preferences (low stock, budget overrun, compliance)
- Integration cards (QuickBooks, Procore, Slack, Bluebeam)

### 👥 User Management (Admin only)
- View all registered users with roles and statuses
- Assign / change roles: Admin, Site Manager, Contractor, Client, Block Access
- Invite clients via email (assigned to a specific project)
- GitHub-style email-confirmation deletion flow
- Per-user activity log panel (timeline of all actions)

### 🔐 Authentication
- Google OAuth2 SSO (via `@react-oauth/google`)
- Role-based access control (Admin, Site Manager, Contractor, Client)
- Pending approval flow — new users wait for admin role assignment
- Blocked access screen for restricted users

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** + Vite | UI framework & build tool |
| **Tailwind CSS v4** | Utility-first styling |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client |
| **lucide-react** | Icon library |
| **jsPDF** + **jspdf-autotable** | PDF generation |
| **ExcelJS** | Styled Excel workbook generation |
| **@react-oauth/google** | Google SSO |
| **date-fns** | Date formatting utilities |
| **Cloudinary** | Image / document uploads |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** + **Express 5** | REST API server |
| **MongoDB** + **Mongoose** | Database & ODM |
| **bcryptjs** | Password hashing |
| **JWT** | Session tokens |
| **Nodemailer** + Gmail OAuth2 | Email invitations |
| **Cloudinary SDK** | Server-side asset management |
| **cors**, **dotenv** | Middleware & env config |

---

## 📁 Project Structure

```
SR Associates/
├── backend/
│   ├── config/         # DB connection, Cloudinary config
│   ├── controllers/    # Route handler logic
│   ├── middleware/     # Auth middleware
│   ├── models/         # Mongoose schemas (Project, Expense, Personnel, ...)
│   ├── routes/         # Express route definitions
│   ├── utils/          # Activity logger, cron jobs
│   └── index.js        # Entry point
│
└── frontend/
    ├── public/
    └── src/
        ├── api/            # Axios instance
        ├── components/     # Shared UI components
        ├── context/        # Auth context
        ├── pages/          # Route-level page components
        │   ├── Dashboard.jsx
        │   ├── Projects.jsx
        │   ├── ProjectDetail.jsx
        │   ├── Personnel.jsx
        │   ├── Budget.jsx
        │   ├── Reports.jsx
        │   ├── Settings.jsx
        │   ├── Login.jsx
        │   └── UserProfile.jsx
        └── utils/          # Cloudinary upload helper
```

---

## 🗄️ API Routes

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/projects` | List / create projects |
| `GET/PUT/DELETE` | `/api/projects/:id` | Get / update / delete project |
| `GET/POST` | `/api/projects/:id/daily-logs` | Project daily logs |
| `GET/POST` | `/api/projects/:id/inventory` | Project materials |
| `GET/POST` | `/api/expenses` | List / create expenses |
| `GET/PUT/DELETE` | `/api/expenses/:id` | Manage expense |
| `GET/POST` | `/api/personnel` | List / add personnel |
| `PATCH` | `/api/personnel/:id/status` | Update member status |
| `GET/POST` | `/api/pins` | Blueprint pins |
| `GET/PUT` | `/api/settings` | Company settings |
| `GET` | `/api/users` | All users (Admin) |
| `PUT` | `/api/users/:id/role` | Update user role |
| `DELETE` | `/api/users/:id` | Delete user |
| `POST` | `/api/users/invite-client` | Email invite a client |
| `POST` | `/api/auth/google` | Google OAuth login |
| `GET` | `/api/budget/:projectId` | Budget summary |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- A Google OAuth2 Client ID
- A Cloudinary account

### 1. Clone the repository
```bash
git clone https://github.com/TChrisVivek/S-R-Associates.git
cd S-R-Associates
```

### 2. Set up the backend
```bash
cd backend
npm install
```

Create a `.env` file in `/backend`:
```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GMAIL_USER=your_gmail_address
```

Start the backend:
```bash
npm run dev     # development (nodemon)
npm start       # production
```

### 3. Set up the frontend
```bash
cd frontend
npm install
```

Create a `.env` file in `/frontend`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

Start the frontend:
```bash
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 🌐 Deployment

| Service | Layer |
|---|---|
| **Vercel** | Frontend (auto-deploy from `main` branch) |
| **Railway / Render** | Backend Node.js server |
| **MongoDB Atlas** | Database |
| **Cloudinary** | Media storage |

Production URL: `https://s-r-associates.vercel.app`

---

## 📄 License

This project is proprietary software developed exclusively for **S R Associates Engineers & Contractors**.  
Unauthorized use, distribution, or modification is prohibited.

---

*Built with ❤️ for S R Associates*

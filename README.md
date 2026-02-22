# S-R-Associates Construction Management Dashboard

A comprehensive, real-time command center for managing architecture and construction projects. Built with a modern, high-performance tech stack, this application allows project managers and stakeholders to oversee everything from material inventory and daily site logs to workforce allocation and dynamic budget calculations.

---

## 🌟 Key Features Implemented

### 1. Dashboard & Core Navigation
*   **Real-time Metrics:** Overview of task completion, budget burn rates, client info, and project specs.
*   **Live Site Feed:** A photo gallery simulating instantaneous uploads from the ground to track visual progress.
*   **Critical Tasks:** A dynamic list of urgent items requiring immediate attention with real-time counters.
*   **Project Settings Modal:** Modify core project data, scope, and scheduling timelines.

### 2. Blueprints & Diagrams Module
*   **PDF to Image Conversion:** Automatically converts uploaded architectural PDFs into high-quality image thumbnails using `pdf-poppler`.
*   **Revision History:** Upload new versions of floor plans with incrementing revision numbers (R1, R2, etc.).
*   **Visual Grid:** View all blueprints, schematics, and structural elevations in an organized masonry layout.
*   **File Downloads:** Securely download the original uploaded blueprint files.

### 3. Material Inventory & Supply Chain
*   **Stock Tracking:** Monitor "Inflow", "Outflow", and current "Balance" of construction materials (e.g., Cement, Steel, Bricks).
*   **Delivery Logging (Multipart Form Data):** Log new material deliveries, complete with supplier info, cost, and uploads for delivery challans and stack verification photos.
*   **Usage Tracking:** Document material consumption tied to specific site locations or purposes.
*   **Dynamic Budget Calculation:** Material delivery costs are automatically aggregated and reflect in real-time on the project dashboard's Budget Burn Rate ring graph.

### 4. Daily Site Logs
*   **Weather Integration:** Tracks the weather conditions during the logged day.
*   **Workforce Headcounts:** Daily records of supervisors, skilled, and unskilled laborers on site.
*   **Activity Logging:** Detailed notes on work accomplished, roadblocks, and next priorities.

### 5. Personnel & Vendor Management
*   **Team Directory:** A searchable roster of internal staff (Project Managers, Architects, Site Engineers) assigned to a project.
*   **Real-time Allocation:** Click "Add Personnel" to register a new team member and immediately see the UI update without a page refresh.
*   **External Vendors:** Track third-party contractors and specialized trade agencies.
*   **Analytics Bar:** View real-time statistics of total assigned staff, currently on-site headcount, and vendor counts.

---

## 🛠️ Tech Stack

**Frontend**
*   **React (Vite):** Blazing fast development and optimized build processes.
*   **Tailwind CSS:** Modern, utility-first styling for a sleek, premium, and responsive UI.
*   **Lucide React:** Beautiful, consistent icon set.
*   **React Router:** Fluid client-side navigation between projects and dashboards.
*   **Axios:** Configured API instance for backend communication.

**Backend**
*   **Node.js & Express:** Robust backend server for API endpoints and business logic.
*   **MongoDB & Mongoose:** NoSQL database schemas built for complex relationships (Projects, Inventory, Logs, Personnel).
*   **Multer:** Middleware for handling `multipart/form-data`, primarily used for uploading blueprints, live feed photos, and delivery documents.
*   **pdf-poppler:** Native PDF processing to generate image thumbnails for blueprint previews.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB Instance (Local or Atlas)
*   Poppler (Required for PDF to Image conversion)

### Installation

1.  **Clone the Repository**
    ```sh
    git clone https://github.com/TChrisVivek/S-R-Associates.git
    cd S-R-Associates
    ```

2.  **Setup Backend**
    ```sh
    cd backend
    npm install
    # Ensure MongoDB is running and your connection string in config/database.js is correct
    npm run dev
    ```

3.  **Setup Frontend**
    ```sh
    cd ../frontend
    npm install
    npm run dev
    ```

4.  **Access the Application**
    Open your browser to `http://localhost:5173` (or the port Vite provides) to view the dashboard.

---

## 📁 Project Structure

```text
S-R-Associates/
├── backend/
│   ├── config/             # Database connection setup
│   ├── controllers/        # Business logic for API endpoints
│   ├── models/             # Mongoose schemas (Project, Material, Personnel, etc.)
│   ├── routes/             # Express API route mapping
│   ├── uploads/            # Local storage for documents and images
│   └── server.js           # Main Express server entry point
│
└── frontend/
    ├── src/
    │   ├── api/            # Axios instance and configurations
    │   ├── components/     # Reusable React components (Tabs, Modals)
    │   ├── pages/          # Main page views (ProjectDetail, Dashboard)
    │   ├── App.jsx         # Root component & Routing
    │   └── index.css       # Global Tailwind directives
    └── vite.config.js      # Vite build configuration
```

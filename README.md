# S-R-Associates Construction Management Dashboard

A comprehensive, real-time command center for managing architecture and construction projects. Built with a modern, high-performance tech stack, this application allows project managers and stakeholders to oversee everything from material inventory and daily site logs to workforce allocation, dynamic budget calculations, and automated reporting.

---

## 🌟 Key Features Implemented

### 1. Dashboard & Core Navigation
*   **Real-time Metrics:** Overview of task completion, budget burn rates, client info, and project specs.
*   **Live Site Feed:** A photo gallery simulating instantaneous uploads from the ground to track visual progress, powered by Cloudinary.
*   **Client Management:** Invite clients via email to view their project boards.
*   **Company Settings:** Dynamically update company logos, branding, and addresses across the entire dashboard and generated reports.

### 2. Authentication & Authorization
*   **Google SSO:** Secure login and user authentication using Google OAuth2.
*   **Role-Based Access:** Differential access for Admins/Contractors vs Clients viewing their own projects.
*   **Email Invitations:** Automated email invites to clients using a native Gmail REST API integration (bypasses standard cloud SMTP outbound port restrictions) with OAuth2.

### 3. Blueprints & Annotations Module
*   **Visual Grid:** View all blueprints, schematics, and structural elevations in an organized masonry layout.
*   **Interactive Annotations:** Drop interactive "Pins" directly onto blueprint images to mark tasks, snags, or notes with specific coordinates and statuses (Open/Resolved).
*   **File Downloads:** Securely download the original uploaded blueprint files.

### 4. Material Inventory & Supply Chain
*   **Stock Tracking:** Monitor "Inflow", "Outflow", and current "Balance" of construction materials (e.g., Cement, Steel, Bricks).
*   **Delivery Logging:** Log new material deliveries, complete with supplier info, cost, and Cloudinary image uploads for delivery challans and stack verification photos.
*   **Dynamic Budget Calculation:** Material delivery costs are automatically aggregated and reflect in real-time on the project dashboard's Budget Burn Rate ring graph.

### 5. Daily Site Logs & Reports
*   **Weather Integration:** Automatically fetches and tracks weather conditions for the logged day.
*   **Workforce Headcounts:** Daily records of supervisors, skilled, and unskilled laborers on site.
*   **PDF Report Generation:** Generate and download beautifully formatted, branded PDF reports for materials, daily logs, and comprehensive project summaries.

### 6. Personnel & Vendor Management
*   **Team Directory:** A searchable roster of internal staff (Project Managers, Architects, Site Engineers).
*   **Global Database:** Add personnel globally and assign them dynamically to multiple projects.
*   **External Vendors:** Track third-party contractors and specialized trade agencies.

---

## 🛠️ Tech Stack

**Frontend**
*   **React (Vite):** Blazing fast development and optimized build processes.
*   **Tailwind CSS:** Modern, utility-first styling for a sleek, premium, and responsive UI.
*   **Lucide React:** Beautiful, consistent icon set.
*   **React Router:** Fluid client-side navigation.
*   **Zustand:** Lightweight global state management.
*   **Recharts:** Interactive data visualization and charts.

**Backend**
*   **Node.js & Express:** Robust backend server for API endpoints and business logic.
*   **MongoDB & Mongoose:** NoSQL database schemas built for complex relationships (Projects, Inventory, Logs, Personnel, Users).
*   **Cloudinary:** Enterprise-grade cloud storage and delivery for images and documents.
*   **Google OAuth2 & Gmail API:** Secure authentication and robust, non-SMTP email delivery over HTTPS.
*   **Puppeteer/jsPDF:** Server-side and client-side PDF generation natively from HTML.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB Instance (Local or Atlas)
*   Google Cloud Console Project (for OAuth2 & Gmail API)
*   Cloudinary Account (for image hosting)

### Installation

1.  **Clone the Repository**
    ```sh
    git clone https://github.com/TChrisVivek/S-R-Associates.git
    cd S-R-Associates
    ```

2.  **Environment Variables (`backend/.env`)**
    Create a `.env` file in the `backend` directory:
    ```env
    PORT=3000
    MONGO_URI=your_mongodb_connection_string
    CLIENT_URL=http://localhost:5173
    JWT_SECRET=your_jwt_secret

    # Cloudinary Config
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret

    # Google OAuth (For SSO Login)
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    # Email Settings (Gmail API - Bypasses SMTP ports on Render/Vercel)
    SMTP_USER=your_verified_gmail_address
    OAUTH_CLIENT_ID=your_oauth_client_id
    OAUTH_CLIENT_SECRET=your_oauth_client_secret
    OAUTH_REFRESH_TOKEN=your_oauth_refresh_token
    ```

3.  **Environment Variables (`frontend/.env`)**
    Create a `.env` file in the `frontend` directory:
    ```env
    VITE_BACKEND_URL=http://localhost:3000
    VITE_GOOGLE_CLIENT_ID=your_google_client_id
    ```

4.  **Setup & Run Backend**
    ```sh
    cd backend
    npm install
    npm run dev
    ```

5.  **Setup & Run Frontend**
    ```sh
    cd ../frontend
    npm install
    npm run dev
    ```

6.  **Access the Application**
    Open your browser to `http://localhost:5173` to view the dashboard.

---

## 🌐 Deployment Configuration

This application is configured for modern cloud deployment:
*   **Frontend (Vercel):** Seamless continuous deployment. Ensure `VITE_BACKEND_URL` is set to your deployed backend URL.
*   **Backend (Render/Railway):** Express API. Uses Google's Gmail REST API (HTTPS Port 443) for email invites, successfully bypassing the strict outbound SMTP port blocks (Ports 587/465/25) enforced by Render's free tier. 

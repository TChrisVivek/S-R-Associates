import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Personnel from './pages/Personnel';
import Budget from './pages/Budget';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import ProjectDetail from './pages/ProjectDetail';
import ProjectPlanManager from './components/ProjectPlanManager';
import Login from './pages/Login';
import PendingApproval from './pages/PendingApproval';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './pages/UserProfile';
import BlockedAccess from './pages/BlockedAccess';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected 'Pending' route (only accessible if logged in, but not necessarily approved) */}
        <Route path="/pending-approval" element={<ProtectedRoute requireRole="Pending"><PendingApproval /></ProtectedRoute>} />
        <Route path="/blocked" element={<ProtectedRoute requireRole="Blocked"><BlockedAccess /></ProtectedRoute>} />

        {/* Protected Application Routes (must not be pending or blocked) */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
        <Route path="/personnel" element={<ProtectedRoute allowedRoles={['Admin', 'Site Manager']}><Personnel /></ProtectedRoute>} />
        <Route path="/budget" element={<ProtectedRoute allowedRoles={['Admin']}><Budget /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Admin', 'Site Manager', 'Client']}><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['Admin', 'Site Manager']}><SettingsPage /></ProtectedRoute>} />
        <Route path="/plan-manager" element={<ProtectedRoute><ProjectPlanManager /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

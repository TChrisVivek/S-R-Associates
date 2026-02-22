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
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/personnel" element={<Personnel />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/plan-manager" element={<ProjectPlanManager />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

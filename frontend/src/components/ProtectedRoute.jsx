import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import GlobalLoader from './GlobalLoader';

const ProtectedRoute = ({ children, requireRole = null, allowedRoles = null }) => {
    const { user, token, loading } = useAuth();

    if (loading) {
        return <GlobalLoader />;
    }

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role === 'Pending' && requireRole !== 'Pending') {
        return <Navigate to="/pending-approval" replace />;
    }

    if (user.role === 'Blocked' && requireRole !== 'Blocked') {
        return <Navigate to="/blocked" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />; // Redirect to dashboard if not allowed
    }

    return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import GlobalLoader from './GlobalLoader';

const ProtectedRoute = ({ children, requireRole = null }) => {
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

    return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, requireRole = null }) => {
    const { user, token, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-violet-500" size={48} />
            </div>
        );
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

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios'; // Assuming axios instance exists

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize user if token exists
        const initAuth = async () => {
            if (token) {
                try {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (error) {
                    console.error("Token invalid or expired", error);
                    logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, [token]);

    // Global listener to detect unexpected role changes (e.g., getting Blocked or Demoted)
    useEffect(() => {
        let interval;
        if (user && user.role !== 'Pending' && user.role !== 'Blocked') {
            interval = setInterval(async () => {
                try {
                    const res = await api.get('/auth/me');
                    if (res.data && res.data.role !== user.role) {
                        setUser(res.data);
                    }
                } catch (err) {
                    console.error("Silent auth check failed", err);
                    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                        logout();
                    }
                }
            }, 5000); // Check every 5 seconds
        }
        return () => clearInterval(interval);
    }, [user]);

    const login = (newToken, userData) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        setUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const CompanyLogo = ({ className, defaultLogoType = 'auto' }) => {
    // defaultLogoType can be 'white', 'dark', or 'auto' (which uses /logo.png)
    const getFallback = () => {
        if (defaultLogoType === 'white') return '/logo-white.png';
        if (defaultLogoType === 'dark') return '/logo-dark.png';
        return '/logo.png';
    };

    const fallbackLogo = getFallback();
    const [logoUrl, setLogoUrl] = useState(localStorage.getItem('companyLogoUrl') || fallbackLogo);

    useEffect(() => {
        let isMounted = true;

        const fetchLogo = async () => {
            try {
                // If it's already in localStorage, we can still fetch to keep it fresh 
                // but we don't delay the initial render.
                const response = await api.get('/settings/logo');
                if (!isMounted) return;

                const url = response.data?.logoUrl;
                if (url) {
                    setLogoUrl(url);
                    localStorage.setItem('companyLogoUrl', url);
                } else {
                    setLogoUrl(fallbackLogo);
                    localStorage.removeItem('companyLogoUrl');
                }
            } catch (error) {
                // Silently fail if settings can't be fetched (e.g. not logged in)
            }
        };

        const handleLogoUpdate = () => {
            const url = localStorage.getItem('companyLogoUrl');
            setLogoUrl(url || fallbackLogo);
        };

        window.addEventListener('logoUpdated', handleLogoUpdate);

        // Fetch to ensure we have the very latest
        fetchLogo();

        return () => {
            isMounted = false;
            window.removeEventListener('logoUpdated', handleLogoUpdate);
        };
    }, [fallbackLogo]);

    return (
        <img
            src={logoUrl}
            alt="Company Logo"
            className={`object-contain ${className}`}
            crossOrigin="anonymous"
        />
    );
};

export default CompanyLogo;

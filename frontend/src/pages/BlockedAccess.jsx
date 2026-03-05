import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldAlert } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const BlockedAccess = () => {
    const { logout, setUser, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        let interval;
        if (user?.role === 'Blocked') {
            // Poll the server every 5 seconds to check if the role has been updated
            interval = setInterval(async () => {
                try {
                    const res = await api.get('/auth/me');
                    if (res.data) {
                        if (res.data.role !== 'Pending' && res.data.role !== 'Blocked') {
                            setUser(res.data);
                            navigate('/');
                        } else if (res.data.role !== user.role) {
                            setUser(res.data);
                        }
                    }
                } catch (err) {
                    console.error("Failed to verify account status", err);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [user, setUser, navigate]);

    return (
        <div className="flex h-screen items-center justify-center bg-[#0f1117] p-4 font-sans relative overflow-hidden">
            {/* Background ambient lighting */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>

            <div className="max-w-md w-full relative z-10 flex flex-col items-center">
                {/* Logo */}
                <CompanyLogo className="h-14 w-auto object-contain mb-10 drop-shadow-2xl" defaultLogoType="white" />

                {/* Main Card */}
                <div className="w-full bg-[#1a1d2e]/80 backdrop-blur-2xl rounded-3xl border border-red-500/10 p-10 text-center shadow-2xl relative overflow-hidden">

                    {/* Shimmer line */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>

                    <div className="relative">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 relative bg-red-500/10 ring-red-500/20">
                            <span className="absolute inset-0 rounded-full animate-ping opacity-20 duration-1000 bg-red-500/20"></span>
                            <ShieldAlert size={32} className="text-red-400" strokeWidth={2} />
                        </div>
                    </div>

                    <h1 className="text-2xl font-semibold text-white mb-3 tracking-tight">
                        Access Restricted
                    </h1>
                    <p className="text-[15px] text-white/50 mb-8 leading-relaxed">
                        Your access to the secure portal has been temporarily suspended by an administrator.
                    </p>

                    <div className="bg-black/20 rounded-2xl p-4 mb-8 border border-white/[0.05] flex items-start gap-3 text-left">
                        <div className="mt-0.5">
                            <ShieldAlert size={18} className="text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white/90 mb-1">Contact Administrator</h3>
                            <p className="text-[13px] text-white/40 leading-relaxed">
                                If you believe this is an error, please reach out to management for reactivation.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-[14px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-all duration-300 group shadow-lg"
                    >
                        <LogOut size={16} className="text-red-400" />
                        Sign Out
                    </button>
                </div>

                {/* Footer */}
                <p className="text-[11px] text-white/20 mt-8 tracking-widest uppercase">© S R Associates</p>
            </div>
        </div>
    );
};

export default BlockedAccess;

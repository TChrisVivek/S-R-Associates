import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

const PendingApproval = () => {
    const { logout } = useAuth();

    return (
        <div className="flex h-screen items-center justify-center bg-[#0f1117] p-4 font-sans relative overflow-hidden">
            {/* Background ambient lighting */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>

            <div className="max-w-md w-full relative z-10 flex flex-col items-center">
                {/* Logo */}
                <CompanyLogo className="h-14 w-auto object-contain mb-10 drop-shadow-2xl" defaultLogoType="white" />

                {/* Main Card */}
                <div className="w-full bg-[#1a1d2e]/80 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-10 text-center shadow-2xl relative overflow-hidden">

                    {/* Shimmer line */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                    <div className="relative">
                        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-amber-500/20 relative">
                            <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-20 duration-1000"></span>
                            <Clock size={32} className="text-amber-400" strokeWidth={2} />
                        </div>
                    </div>

                    <h1 className="text-2xl font-semibold text-white mb-3 tracking-tight">Account Under Review</h1>
                    <p className="text-[15px] text-white/50 mb-8 leading-relaxed">
                        Your secure profile has been created. Access will be granted once an administrator verifies and assigns your role.
                    </p>

                    <div className="bg-black/20 rounded-2xl p-4 mb-8 border border-white/[0.05] flex items-start gap-3 text-left">
                        <div className="mt-0.5">
                            <ShieldAlert size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white/90 mb-1">Secure Portal Access</h3>
                            <p className="text-[13px] text-white/40 leading-relaxed">
                                If you require immediate access for an active site, please contact your site director.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-[14px] font-medium bg-white/[0.03] text-white/70 hover:bg-red-500/10 hover:text-red-400 border border-white/[0.05] hover:border-red-500/20 transition-all duration-300 group shadow-lg"
                    >
                        <LogOut size={16} className="text-white/30 group-hover:text-red-400 transition-colors" />
                        Return to Sign In
                    </button>
                </div>

                {/* Footer */}
                <p className="text-[11px] text-white/20 mt-8 tracking-widest uppercase">© S R Associates</p>
            </div>
        </div>
    );
};

export default PendingApproval;

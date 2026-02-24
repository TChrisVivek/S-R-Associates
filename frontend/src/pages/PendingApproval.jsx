import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, Compass } from 'lucide-react';

const PendingApproval = () => {
    const { logout } = useAuth();

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-400"></div>

                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Clock size={40} className="text-orange-500" />
                </div>

                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Approval Pending</h1>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                    Your account has been successfully created and is currently under review by the Site Administrator. You will be granted access once your role is assigned.
                </p>

                <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                    <div className="flex items-center gap-3 justify-center mb-2">
                        <Compass className="text-blue-500" size={20} />
                        <span className="font-bold text-slate-800 tracking-tight">BuildCore Portal</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">Please contact your site director if you require immediate access.</p>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default PendingApproval;

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, Building2 } from 'lucide-react';

const PendingApproval = () => {
    const { logout } = useAuth();

    return (
        <div className="flex h-screen items-center justify-center bg-[#f6f7f9] p-4 font-sans">
            <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-5">
                    <Clock size={24} className="text-amber-500" />
                </div>

                <h1 className="text-lg font-semibold text-gray-900 mb-2">Approval Pending</h1>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    Your account is under review. You'll be granted access once the administrator assigns your role.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                    <div className="flex items-center gap-2 justify-center mb-1">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                            <Building2 size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">BuildCore Portal</span>
                    </div>
                    <p className="text-[11px] text-gray-400">Contact your site director for immediate access.</p>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-100 hover:border-red-200 transition-colors"
                >
                    <LogOut size={14} />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default PendingApproval;

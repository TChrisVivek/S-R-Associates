
import { useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
    const config = {
        success: { border: 'border-l-emerald-500', icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-50' },
        error: { border: 'border-l-red-500', icon: <AlertCircle className="w-4 h-4 text-red-500" />, bg: 'bg-red-50' },
        info: { border: 'border-l-violet-500', icon: <Info className="w-4 h-4 text-violet-500" />, bg: 'bg-violet-50' },
        warning: { border: 'border-l-amber-500', icon: <AlertCircle className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-50' },
    };
    const c = config[type] || config.info;

    return (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 ${c.border} border-l-[3px] shadow-lg shadow-black/5 animate-slide-in`}>
            {c.icon}
            <span className="text-sm font-medium text-gray-700">{message}</span>
            <button onClick={onClose} className="ml-2 p-1 text-gray-300 hover:text-gray-500 rounded-md transition-colors">
                <X size={14} />
            </button>
        </div>
    );
};

export const useToast = () => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const ToastComponent = toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
    ) : null;

    return { showToast, ToastComponent };
};

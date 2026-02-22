
import { useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500',
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-white" />,
        error: <AlertCircle className="w-5 h-5 text-white" />,
        info: <Info className="w-5 h-5 text-white" />,
        warning: <AlertCircle className="w-5 h-5 text-white" />,
    };

    return (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 animate-slide-in ${bgColors[type] || bgColors.info}`}>
            {icons[type]}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={16} />
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

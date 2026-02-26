import React from 'react';
import { Building2 } from 'lucide-react';

const GlobalLoader = () => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
                {/* Outer rotating pulse effect */}
                <div className="absolute w-28 h-28 rounded-full border-[3px] border-t-violet-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin opacity-80 shadow-xl shadow-violet-500/30"></div>
                <div className="absolute w-24 h-24 rounded-full border-[3px] border-t-transparent border-r-transparent border-b-blue-400 border-l-violet-400 animate-[spin_1.5s_linear_infinite_reverse] opacity-60"></div>

                {/* Inner static logo wrapper */}
                <div className="w-16 h-16 rounded-2xl bg-[#1a1d2e] flex items-center justify-center shadow-lg shadow-violet-500/30 z-10 transition-transform hover:scale-105 duration-300 relative overflow-hidden">
                    <img src="/logo-white.png" alt="Logo" className="w-12 h-auto object-contain relative z-10 p-1" />

                    {/* Subtle internal glow */}
                    <div className="absolute inset-0 bg-white/10 blur-xl rounded-2xl pointer-events-none"></div>
                </div>
            </div>

            <p className="mt-10 text-xs font-bold tracking-[0.25em] uppercase text-gray-500 animate-pulse">
                Loading
            </p>
        </div>
    );
};

export default GlobalLoader;

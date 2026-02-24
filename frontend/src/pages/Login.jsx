import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Building2 } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const { showToast, ToastComponent } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsLoading(true);
        try {
            const res = await api.post('/auth/google', { credential: credentialResponse.credential });
            login(res.data.token, res.data.user);
            showToast("Successfully authenticated", "success");
            if (res.data.user.role === 'Pending') navigate('/pending-approval');
            else navigate('/');
        } catch (error) {
            console.error("Login failed:", error);
            showToast("Authentication failed. Please try again.", "error");
        } finally { setIsLoading(false); }
    };

    const handleGoogleError = () => { showToast("Google Sign-In failed", "error"); };

    return (
        <div className="flex h-screen w-full bg-[#0f1117] font-sans overflow-hidden">
            {ToastComponent}

            {/* Left — Visual Panel */}
            <div className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=2000" alt="Construction" className="w-full h-full object-cover opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f1117]/80 to-transparent"></div>
                </div>
                <div className="relative z-10 p-10 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Building2 size={16} className="text-white" />
                    </div>
                    <span className="font-semibold text-sm text-white/80">BuildCore</span>
                </div>
                <div className="relative z-10 p-10 pb-16 max-w-lg">
                    <h1 className="text-5xl font-semibold text-white leading-[1.15] tracking-tight mb-4">
                        Build with <br /><span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Confidence</span>
                    </h1>
                    <p className="text-white/30 text-sm leading-relaxed max-w-md">
                        The industry's leading platform for architectural project management and real-time site coordination.
                    </p>
                </div>
            </div>

            {/* Right — Login Form */}
            <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-8 bg-white relative">
                <div className="w-full max-w-sm flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
                        <Building2 size={20} className="text-white" />
                    </div>

                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">BuildCore Portal</p>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Welcome Back</h2>
                    <p className="text-gray-400 text-sm text-center mb-8">Sign in to manage your construction projects.</p>

                    <div className={`w-full flex justify-center transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className="w-full border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                useOneTap
                                size="large"
                                width="400"
                                text="continue_with"
                                shape="rectangular"
                                context="use"
                            />
                        </div>
                    </div>

                    <div className="mt-10 text-center text-[11px] text-gray-300 max-w-xs leading-relaxed">
                        By signing in, you agree to our <a href="#" className="text-violet-500 hover:text-violet-600">Terms</a> and <a href="#" className="text-violet-500 hover:text-violet-600">Privacy Policy</a>.
                    </div>
                </div>

                <div className="absolute bottom-6 w-full px-8 flex justify-between items-center text-[10px] text-gray-300">
                    <p>© 2024 BuildCore Technologies</p>
                    <div className="flex gap-5">
                        <a href="#" className="hover:text-gray-500 transition-colors">Help</a>
                        <a href="#" className="hover:text-gray-500 transition-colors">Security</a>
                        <a href="#" className="hover:text-gray-500 transition-colors">Status</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

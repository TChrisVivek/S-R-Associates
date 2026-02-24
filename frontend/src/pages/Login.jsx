import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Compass } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const { showToast, ToastComponent } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsLoading(true);
        try {
            const res = await api.post('/auth/google', {
                credential: credentialResponse.credential
            });

            // Log the user in
            login(res.data.token, res.data.user);

            showToast("Successfully authenticated", "success");

            // Redirect based on role
            if (res.data.user.role === 'Pending') {
                navigate('/pending-approval');
            } else {
                navigate('/'); // Go to dashboard
            }
        } catch (error) {
            console.error("Login failed:", error);
            showToast("Authentication failed. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        showToast("Google Sign-In failed", "error");
    };

    return (
        <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
            {ToastComponent}
            {/* Left Side - Image & Copy */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 relative bg-slate-900 overflow-hidden p-12">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=2000"
                        alt="Construction Site"
                        className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                </div>

                {/* Logo top left */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Compass className="text-white" size={24} />
                    </div>
                    <span className="text-white font-extrabold text-2xl tracking-tight">BuildCore</span>
                </div>

                {/* Bottom Text */}
                <div className="relative z-10 max-w-lg mb-12">
                    <h1 className="text-6xl font-extrabold text-white leading-tight tracking-tight mb-2">Build with</h1>
                    <h1 className="text-6xl font-extrabold text-blue-500 leading-tight tracking-tight mb-6">Confidence</h1>
                    <p className="text-lg text-slate-300 font-medium leading-relaxed">
                        The industry's leading platform for architectural project management and real-time site coordination.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative">
                <div className="w-full max-w-md flex flex-col items-center">

                    {/* Centered Logo Icon */}
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100">
                        <Compass className="text-blue-500" size={32} />
                    </div>

                    <h3 className="text-xs font-extrabold tracking-widest text-slate-500 uppercase mb-4">BuildCore Portal</h3>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Welcome Back</h2>
                    <p className="text-slate-500 text-center mb-10 font-medium">
                        Please sign in to manage your construction projects.
                    </p>

                    {/* Google Button Container */}
                    <div className={`w-full flex justify-center transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className="w-full border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
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

                    <div className="mt-12 text-center text-xs text-slate-400 font-medium max-w-xs">
                        By signing in, you agree to our <a href="#" className="text-blue-500 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a>.
                    </div>
                </div>

                {/* Footer Links */}
                <div className="absolute bottom-8 w-full px-12 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <p>© 2024 BuildCore Technologies Inc.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-slate-600">Help Center</a>
                        <a href="#" className="hover:text-slate-600">Security</a>
                        <a href="#" className="hover:text-slate-600">Status</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

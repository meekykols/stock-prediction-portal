import React, { useContext, useEffect, useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useDarkMode } from '../../context/ThemeContext';
import Header from '../../component/Header';
import Footer from '../../component/Footer';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../API/API';
import toast from 'react-hot-toast';
import { Oval } from 'react-loader-spinner';
import { AuthContext } from '../../utilities/AuthProvider';

const Login = () => {
    const navigate = useNavigate()
    const { isLoggedIN, setIsLoggedIn } = useContext(AuthContext)
    const [loading, setLoading] = useState(false);
    const { darkmode } = useDarkMode();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [rememberMe, setRememberMe] = useState(false);
    useEffect(() => {
        if (isLoggedIN) {
            navigate("/dashboard")
        }
    }, [isLoggedIN])

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        }


        if (!formData.password) {
            newErrors.detail = 'Password is required';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validateForm();
        setLoading(true)

        if (Object.keys(newErrors).length === 0) {
            //console.log('Form submitted:', formData);
            try {
                const response = await api.post(`/token/`, formData)

                setFormData({
                    username: '',
                    password: '',
                })
                toast.success("login successful")
                localStorage.setItem("accessToken", response.data.access)
                localStorage.setItem("refreshToken", response.data.refresh)
                setIsLoggedIn(true)
                navigate("/dashboard")
            } catch (error) {

                toast.error(error.response.data.detail)
                setErrors(error.response.data.detail)
                //console.log(error.response.data.detail)
            } finally {
                setLoading(false)
            }
        } else {
            setErrors(newErrors);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (

        <div data-theme={darkmode ? "dracula" : "cupcake"}>
            <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">

                <div className="w-full max-w-md">
                    {/* Card Container */}
                    <div className="card bg-base-100 shadow-2xl">
                        <div className="card-body">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="flex justify-center mb-4">
                                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform duration-300">
                                        <LogIn className="w-10 h-10 text-white" />
                                    </div>
                                </div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                                    Welcome Back
                                </h1>
                                <p className="text-base-content/60">Sign in to continue to your account</p>
                            </div>

                            {/* Login Form */}
                            <div className="space-y-5">
                                {/* Username Field */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-base">Username</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type="text"
                                            name="username"
                                            placeholder="Enter your username"
                                            className={`input input-bordered w-full pl-12 h-12 text-base ${errors.username ? 'input-error' : 'focus:input-primary'
                                                }`}
                                            value={formData.username}
                                            onChange={handleChange}
                                            onKeyPress={handleKeyPress}
                                        />
                                    </div>
                                    {errors.username && (
                                        <label className="label">
                                            <span className="label-text-alt text-error flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors.username}
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-base">Password</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            placeholder="Enter your password"
                                            className={`input input-bordered w-full pl-12 pr-12 h-12 text-base ${errors.password ? 'input-error' : 'focus:input-primary'
                                                }`}
                                            value={formData.password}
                                            onChange={handleChange}
                                            onKeyPress={handleKeyPress}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-base-200/50 px-3 rounded-r-lg transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5 text-base-content/60 hover:text-base-content" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-base-content/60 hover:text-base-content" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <label className="label">
                                            <span className="label-text-alt text-error flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors.password}
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {/* Remember Me & Forgot Password */}
                                <div className="flex items-center justify-between">
                                    <label className="label cursor-pointer gap-2 p-0">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-primary checkbox-sm"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <span className="label-text">Remember me</span>
                                    </label>
                                    <a href="#" className="link link-primary text-sm font-medium hover:link-hover">
                                        Forgot password?
                                    </a>
                                </div>

                                {/* Login Button */}
                                <div className="form-control mt-6">
                                    {
                                        loading ? <button disabled={loading ? false : true}
                                            className={`btn btn-primary w-full h-12 text-base text-white shadow-lg hover:shadow-xl transition-all duration-300 ${loading ? 'bg-gray-400' : ''}`}
                                        >
                                            <Oval
                                                visible={true}
                                                height="30"
                                                width="50"
                                                color="white"
                                            />
                                        </button> : <button
                                            onClick={handleSubmit}
                                            className="btn btn-primary w-full h-12 text-base text-white shadow-lg hover:shadow-xl transition-all duration-300"
                                        >
                                            <LogIn className="w-5 h-5 mr-2" />
                                            Sign In
                                        </button>
                                    }

                                </div>
                            </div>

                            {/* Divider */}
                            <div className="divider my-6">OR CONTINUE WITH</div>

                            {/* Social Login */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    className="btn btn-outline h-12 hover:bg-base-200"
                                    onClick={() => console.log('Google login')}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="ml-2">Google</span>
                                </button>
                                <button
                                    className="btn btn-outline h-12 hover:bg-base-200"
                                    onClick={() => console.log('GitHub login')}
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    <span className="ml-2">GitHub</span>
                                </button>
                            </div>

                            {/* Sign Up Link */}
                            <div className="text-center mt-6 pt-4 border-t border-base-300">
                                <p className="text-sm text-base-content/60">
                                    Don't have an account?{' '}
                                    <Link to='/registration' className="link link-primary font-semibold hover:link-hover">
                                        Create an account
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="text-center mt-6">
                        <p className="text-xs text-base-content/50">
                            Protected by industry-standard encryption
                        </p>
                    </div>
                </div>
            </div>

        </div>

    );
};

export default Login;
import React, { useState } from 'react';
import { Mail, User, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useDarkMode } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../API/API';
import { Oval } from 'react-loader-spinner'

const Registration = () => {
    const { darkmode } = useDarkMode();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

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
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
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
                await api.post(`/register/`, formData)

                setFormData({
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: ''
                })
                toast.success("registration successful")

            } catch (error) {

                toast.error(`Something went wrong`)
                setErrors(error.response.data)
            } finally {
                setLoading(false)
            }
        } else {
            setErrors(newErrors);
        }
    };


    return (
        <div data-theme={darkmode ? "dracula" : "cupcake"}>
            <div data-theme={darkmode ? "dracula" : "cupcake"} className="h-full bg-linear-to-br flex items-center justify-center p-4">

                <div className="w-full max-w-md">
                    {/* Card Container */}
                    <div className="card bg-base-100 shadow-2xl">
                        <div className="card-body">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-linear-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                        <User className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <h2 className="text-3xl font-bold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                    Create Account
                                </h2>
                                <p className="text-base-content/60 mt-2">Join us today and get started</p>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                {/* Username Field */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Username</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type="text"
                                            name="username"
                                            placeholder="Enter your username"
                                            className={`input input-bordered w-full pl-10 ${errors.username ? 'input-error' : 'focus:input-primary'}`}
                                            value={formData.username}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    {errors.username && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.username}</span>
                                        </label>
                                    )}
                                </div>

                                {/* Email Field */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Email</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Enter your email"
                                            className={`input input-bordered w-full pl-10 ${errors.email ? 'input-error' : 'focus:input-primary'}`}
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    {errors.email && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.email}</span>
                                        </label>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Password</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            placeholder="Enter your password"
                                            className={`input input-bordered w-full pl-10 pr-10 ${errors.password ? 'input-error' : 'focus:input-primary'}`}
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5 text-base-content/40 hover:text-base-content" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-base-content/40 hover:text-base-content" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.password}</span>
                                        </label>
                                    )}
                                </div>

                                {/* Confirm Password Field */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Confirm Password</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            placeholder="Confirm your password"
                                            className={`input input-bordered w-full pl-10 pr-10 ${errors.confirmPassword ? 'input-error' : 'focus:input-primary'}`}
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="w-5 h-5 text-base-content/40 hover:text-base-content" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-base-content/40 hover:text-base-content" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.confirmPassword}</span>
                                        </label>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <div className="form-control mt-6">
                                    {loading ? <button onClick={handleSubmit} className="btn btn-primary w-full text-white">
                                        <Oval
                                            visible={true}
                                            height="30"
                                            width="50"
                                            color="white"
                                        />

                                    </button> : <button onClick={handleSubmit} className="btn btn-primary w-full text-white">

                                        Create Account
                                    </button>}

                                </div>
                            </div>

                            {/* Divider */}
                            <div className="divider">OR</div>

                            {/* Social Login */}
                            <div className="space-y-2">
                                <button className="btn btn-outline w-full" onClick={() => console.log('Google login')}>
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </button>
                                <button className="btn btn-outline w-full" onClick={() => console.log('GitHub login')}>
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    Continue with GitHub
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="text-center mt-4">
                                <p className="text-sm text-base-content/60">
                                    Already have an account?{' '}
                                    <Link to="/login" className="link link-primary font-medium">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Theme Toggle Example */}
                </div>
            </div>
        </div>


    );
};

export default Registration;
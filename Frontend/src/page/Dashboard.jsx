import React, { useContext, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, User, DollarSign, HelpCircle, BarChart2, CreditCard, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useDarkMode } from '../context/ThemeContext';
import { AuthContext } from '../utilities/AuthProvider';

export default function Dashboard() {
    const [isShowed, setIsShowed] = useState(true);
    const { darkmode } = useDarkMode();
    const { setIsLoggedIn } = useContext(AuthContext)

    return (
        <div data-theme={darkmode ? "dracula" : "cupcake"} className="flex h-screen ">
            {/* Sidebar */}
            <div
                className={`${isShowed ? 'block' : 'hidden'
                    } w-64 min-h-full  transition-all duration-300`}
            >
                {/* Brand/Logo Section */}
                <div className="p-6 border-b ">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10  rounded-xl flex items-center justify-center shadow-lg">
                            <BarChart2 className="w-6 h-6 " />
                        </div>
                        <span className="text-xl font-bold  bg-clip-text text-transparent">
                            Dashboard
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <div className="py-6 px-3">
                    {/* ACCOUNT Section */}
                    <div className="mb-6">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider">
                                Account
                            </span>
                        </div>
                        <div className="space-y-1">
                            <SidebarItem
                                onClick={() => setIsShowed(false)}
                                icon={<Home className="w-5 h-5" />}
                                label="Dashboard"
                                to="/dashboard"
                            />
                            <SidebarItem
                                onClick={() => setIsShowed(false)}
                                icon={<User className="w-5 h-5" />}
                                label="My Profile"
                                to="/dashboard/profile"
                            />
                            <SidebarItem
                                onClick={() => setIsShowed(false)}
                                icon={<BarChart2 className="w-5 h-5" />}
                                label="Prediction"
                                to="/dashboard/prediction"
                            />
                        </div>
                    </div>

                    {/* FINANCES Section */}
                    <div className="mb-6">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold  uppercase tracking-wider">
                                Finances
                            </span>
                        </div>
                        <div className="space-y-1">
                            <SidebarItem
                                onClick={() => setIsShowed(false)}
                                icon={<DollarSign className="w-5 h-5" />}
                                label="football prediction"
                                to="/dashboard/"
                            />
                            <SidebarItem
                                onClick={() => setIsShowed(false)}
                                icon={<CreditCard className="w-5 h-5" />}
                                label="forex prediction"
                                to="/dashboard/"
                            />
                        </div>
                    </div>

                    {/* INFORMATION Section */}
                    <div className="mb-6">
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider">
                                Information
                            </span>
                        </div>
                        <div className="space-y-1">
                            <SidebarItem
                                onClick={() => {
                                    setIsShowed(false);
                                    console.log('triggered much from how to by');
                                }}
                                icon={<HelpCircle className="w-5 h-5" />}
                                label="FAQ"
                                to="/dashboard/"
                            />
                        </div>
                    </div>

                    {/* LOGOUT Section */}
                    <div
                        onClick={() => {
                            localStorage.removeItem("accessToken")
                            localStorage.removeItem("refreshToken")
                            setIsLoggedIn(false)
                        }}
                        className="mt-auto pt-6 border-t border-slate-800"
                    >
                        <div className="px-3 mb-2">
                            <span className="text-xs font-semibold  uppercase tracking-wider" >
                                Logout
                            </span>
                        </div>
                        <SidebarItem
                            icon={<LogOut className="w-5 h-5" />}
                            label="Logout"
                            to="#"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full flex-1 overflow-auto">
                {/* Toggle Sidebar Button */}
                <div className="p-4 flex items-center">
                    <button
                        onClick={() => setIsShowed(!isShowed)}
                        className="p-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                        {isShowed ? (
                            <ChevronLeft className="w-5 h-5  animate-pulse" />
                        ) : (
                            <ChevronRight className="w-5 h-5  animate-pulse" />
                        )}
                    </button>
                </div>

                {/* Content Area - Outlet renders here */}
                <div className="p-6 w-full">
                    <Outlet context={{}} />
                </div>
            </div>
        </div >
    );
}

// Sidebar Item component using NavLink for active state management
function SidebarItem({ icon, label, to, onClick }) {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                    ? '  shadow-lg shadow-purple-500/30'
                    : ' '
                }`
            }
        >
            <div className="transition-transform hover:scale-110">
                {icon}
            </div>
            <span>{label}</span>
        </NavLink>
    );
}
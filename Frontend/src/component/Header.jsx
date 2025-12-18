import React, { useState } from 'react';
import Darkmodebutton from './DarkmodeButton';
import { IoCloseSharp } from "react-icons/io5";
import { GiHamburgerMenu } from "react-icons/gi";

const Header = ({webName}) => {
    //const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <>
        {/* <div data-theme="dark" className='flex flex-col gap-y-1 shadow-2xs py-3'>
            <div className='flex flex-row gap-2 justify-between items-center py'>
                <h2>{webName}</h2>
                <div className='flex justify-around gap-x-1 px-3'>
                   
                      <Darkmodebutton/>
                 
                    <div className='space-x-2'>
                    <button className="btn btn-outline btn-secondary">sign in</button>
                    <button className="btn btn-outline btn-secondary">sign out</button>
                    </div>
                    
                </div>
            </div>
            <div></div>
        </div> */}
         {/* <header className="navbar bg-base-200 shadow-lg px-4 lg:px-8">
                <div className="navbar-start">
                    <div className="dropdown lg:hidden">
                    <label 
                        tabIndex={0} 
                        className="btn btn-ghost btn-circle"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? (
                        <IoCloseSharp className="h-6 w-6" />
                        ) : (
                        <GiHamburgerMenu className="h-6 w-6" />
                        )}
                    </label>
                    {isMobileMenuOpen && (
                        <ul 
                        tabIndex={0} 
                        className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-200 rounded-box w-52"
                        >
                        <li><a>Home</a></li>
                        <li><a>About</a></li>
                        <li><a>Services</a></li>
                        <li><a>Contact</a></li>
                        </ul>
                    )}
                    </div>
                    <a className="btn btn-ghost text-xl lg:text-2xl font-bold normal-case">
                    {webName}
                    </a>
                </div>

                <div className="navbar-center hidden lg:flex">
                    <ul className="menu menu-horizontal px-1 gap-2">
                    <li><a className="hover:bg-base-300 rounded-lg">Home</a></li>
                    <li><a className="hover:bg-base-300 rounded-lg">About</a></li>
                    <li><a className="hover:bg-base-300 rounded-lg">Services</a></li>
                    <li><a className="hover:bg-base-300 rounded-lg">Contact</a></li>
                    </ul>
                </div>

                <div className="navbar-end gap-2">
                    <Darkmodebutton />
                    </div>

                    <div className="hidden sm:flex gap-2">
                    <button className="btn btn-outline btn-primary">
                        Sign In
                    </button>
                    <button className="btn btn-primary">
                        Sign Up
                    </button>
                    </div>

                    <div className="dropdown dropdown-end sm:hidden">
                    <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                        <span className="text-sm">U</span>
                        </div>
                    </label>
                    <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-200 rounded-box w-52">
                        <li><a>Sign In</a></li>
                        <li><a>Sign Up</a></li>
                    </ul>
                    </div>
            
           </header> */}
           <header className="w-full shadow-md border-b border-base-200 bg-base-100 dark:bg-base-300">
      <div className="navbar max-w-7xl mx-auto px-4">

        {/* Left: Brand */}
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-wide text-base-content">
            {webName}
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">

          {/* Theme Toggle */}
          <Darkmodebutton />

          {/* Auth Buttons */}
          <div className="hidden sm:flex gap-2">
            <button className="btn btn-sm btn-outline btn-primary">
              Sign in
            </button>
            <button className="btn btn-sm btn-primary">
              Sign out
            </button>
          </div>

          {/* Mobile Menu */}
          <div className="dropdown dropdown-end sm:hidden">
            <label tabIndex={0} className="btn btn-ghost btn-circle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-40"
            >
              <li><button>Sign in</button></li>
              <li><button>Sign out</button></li>
            </ul>
          </div>

        </div>
      </div>
    </header>
  

        
        </>
    );
};

export default Header;
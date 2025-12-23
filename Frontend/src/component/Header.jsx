import React, { useContext, useEffect } from 'react';
import Darkmodebutton from './DarkmodeButton';
import { IoCloseSharp } from "react-icons/io5";
import { GiHamburgerMenu } from "react-icons/gi";
import { Link, useNavigate } from 'react-router-dom';
import { useHome } from '../context/HomeContext';
import { useDarkMode } from '../context/ThemeContext';
import { AuthContext } from '../utilities/AuthProvider';
import { User } from 'lucide-react';


const Header = () => {
  //const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate()
  const { darkmode } = useDarkMode();
  const { siteval } = useHome();
  const { isLoggedIN, setIsLoggedIn } = useContext(AuthContext)

  useEffect(() => {
    if (isLoggedIN) {
      navigate("/")
    }
  }, [isLoggedIN])

  return (
    <>

      <header data-theme={darkmode ? "dracula" : "cupcake"} className="w-full shadow-md border-b border-base-200 bg-base-100 dark:bg-base-300">
        <div className="navbar max-w-7xl mx-auto px-4">

          {/* Left: Brand */}
          <div className="flex-1">
            <Link to="/" className="text-xl font-bold tracking-wide text-base-content">
              {siteval?.web_name}
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <Darkmodebutton />

            {/* Auth Buttons */}

            {
              isLoggedIN ? <div className="hidden sm:flex gap-2">
                <Link to="/dashboard" className="btn btn-sm btn-outline btn-primary">
                  <User />
                </Link>
                <button onClick={() => {
                  localStorage.removeItem("accessToken")
                  localStorage.removeItem("refreshToken")
                  setIsLoggedIn(false)
                }} className="btn btn-sm btn-primary">
                  Logout
                </button>
              </div> : <div className="hidden sm:flex gap-2">
                <Link to="/login" className="btn btn-sm btn-outline btn-primary">
                  Sign in
                </Link>
                <Link to="/registration" className="btn btn-sm btn-primary">
                  Sign out
                </Link>
              </div>
            }


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
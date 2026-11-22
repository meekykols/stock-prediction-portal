import { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ExternalLink, LogOut, Menu, Moon, Sun, UserCog } from 'lucide-react';
import Logo from '../ui/Logo';
import PageLoader from '../ui/PageLoader';
import { NAV_SECTIONS, ROUTES } from '../../routers/routes';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { logout } from '../../store/authSlice';
import { initials } from '../../utils/format';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';

export default function AdminLayout() {
  const { user, can } = useAuth();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const nav = NAV_SECTIONS.map((section) => ({
    section,
    items: ROUTES.filter((r) => r.section === section && can(r.permission)),
  })).filter((g) => g.items.length);

  const close = () => { const el = document.getElementById('admin-drawer'); if (el) el.checked = false; };
  const onLogout = async () => { await dispatch(logout()); navigate('/login', { replace: true }); };

  return (
    <div className="drawer lg:drawer-open">
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-base-content/10 bg-base-100/80 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <label htmlFor="admin-drawer" className="btn btn-ghost btn-circle btn-sm lg:hidden" aria-label="Open menu"><Menu className="size-5" /></label>
            <div className="lg:hidden"><Logo isDark={theme.isDark} /></div>
            <div className="flex-1" />
            <a href={SITE_URL} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm hidden sm:inline-flex"><ExternalLink className="size-4" /> View site</a>
            <button type="button" className="btn btn-ghost btn-circle btn-sm" onClick={() => theme.setMode(theme.isDark ? 'light' : 'dark')} aria-label="Toggle theme">
              {theme.isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <div className="dropdown dropdown-end">
              <button type="button" tabIndex={0} className="avatar avatar-placeholder" aria-label="Account menu">
                <div className="w-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content"><span className="text-xs font-semibold">{initials(user)}</span></div>
              </button>
              <ul tabIndex={0} className="menu dropdown-content z-50 mt-3 w-56 rounded-box border border-base-content/10 bg-base-200 p-2 shadow-xl">
                <li className="menu-title truncate">{user?.fullName}<span className="block truncate text-xs font-normal capitalize opacity-60">{user?.role}</span></li>
                <li><Link to="/account"><UserCog className="size-4" /> My account</Link></li>
                <li><button type="button" onClick={onLogout}><LogOut className="size-4" /> Sign out</button></li>
              </ul>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoader fullScreen={false} />}><Outlet /></Suspense>
        </main>
      </div>

      <aside className="drawer-side z-40">
        <label htmlFor="admin-drawer" className="drawer-overlay" aria-label="Close menu" />
        <div className="flex min-h-full w-64 flex-col border-r border-base-content/10 bg-base-200/95 backdrop-blur-xl">
          <div className="flex h-14 items-center px-5"><Logo isDark={theme.isDark} /></div>
          <nav className="flex-1 px-3 py-2">
            {nav.map((g) => (
              <div key={g.section} className="mb-3">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-base-content/40">{g.section}</p>
                <ul className="menu w-full gap-0.5 p-0">
                  {g.items.map(({ path, label, icon: Icon }) => (
                    <li key={path}>
                      <NavLink to={path} end={path === '/'} onClick={close} className={({ isActive }) => `rounded-field py-2 ${isActive ? 'bg-primary/15 font-medium text-primary' : 'text-base-content/75'}`}>
                        <Icon className="size-4" /> {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="border-t border-base-content/10 px-5 py-3 text-xs text-base-content/50">
            Signed in as <span className="font-medium capitalize text-base-content/70">{user?.role}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

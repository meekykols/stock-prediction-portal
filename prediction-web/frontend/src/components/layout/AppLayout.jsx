import { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  CandlestickChart, CreditCard, Globe, History, LayoutDashboard, LogOut, Menu, Settings, Trophy,
} from 'lucide-react';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import PageLoader from '../ui/PageLoader';
import AnnouncementBar from './AnnouncementBar';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { logout } from '../../store/authSlice';
import { initials } from '../../utils/format';

const NAV = [
  { to: '/app', key: 'overview', icon: LayoutDashboard, end: true },
  { to: '/app/stocks', key: 'stocks', icon: CandlestickChart },
  { to: '/app/sports', key: 'sports', icon: Trophy },
  { to: '/app/history', key: 'history', icon: History },
  { to: '/app/billing', key: 'billing', icon: CreditCard },
  { to: '/app/settings', key: 'settings', icon: Settings },
];

export default function AppLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, plan } = useAuth();
  const { contact, siteName } = useSiteConfig();

  const closeDrawer = () => {
    const el = document.getElementById('app-drawer');
    if (el) el.checked = false;
  };

  const onLogout = async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-h-screen flex-col">
        <AnnouncementBar />
        <header className="sticky top-0 z-30 border-b border-base-content/10 bg-base-100/70 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <label htmlFor="app-drawer" className="btn btn-ghost btn-circle btn-sm lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </label>
            <div className="lg:hidden"><Logo to="/app" isDark={theme.isDark} /></div>
            <div className="flex-1" />
            {plan && (
              <Link to="/app/billing" className="badge badge-primary badge-soft hidden sm:inline-flex">
                {plan.name} plan
              </Link>
            )}
            <ThemeToggle isDark={theme.isDark} setMode={theme.setMode} />
            <div className="dropdown dropdown-end">
              <button type="button" tabIndex={0} className="avatar avatar-placeholder" aria-label="Account menu">
                <div className="w-9 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content">
                  {user?.avatar?.url ? <img src={user.avatar.url} alt="" /> : <span className="text-sm font-semibold">{initials(user)}</span>}
                </div>
              </button>
              <ul tabIndex={0} className="menu dropdown-content z-50 mt-3 w-56 rounded-box border border-base-content/10 bg-base-200 p-2 shadow-xl">
                <li className="menu-title truncate">{user?.fullName}<span className="block truncate text-xs font-normal opacity-60">{user?.email}</span></li>
                <li><Link to="/app/settings"><Settings className="size-4" />{t('app.settings')}</Link></li>
                <li><Link to="/"><Globe className="size-4" />{t('app.viewSite')}</Link></li>
                <li><button type="button" onClick={onLogout}><LogOut className="size-4" />{t('app.logout')}</button></li>
              </ul>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <Suspense fallback={<PageLoader fullScreen={false} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <aside className="drawer-side z-40">
        <label htmlFor="app-drawer" className="drawer-overlay" aria-label="Close menu" />
        <div className="flex min-h-full w-72 flex-col border-r border-base-content/10 bg-base-200/95 backdrop-blur-xl">
          <div className="flex h-16 items-center px-6"><Logo to="/app" isDark={theme.isDark} /></div>
          <ul className="menu w-full flex-1 gap-1 px-4 py-4">
            {NAV.map(({ to, key, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={closeDrawer}
                  className={({ isActive }) =>
                    `rounded-field py-2.5 ${isActive ? 'bg-primary/15 text-primary font-medium' : 'text-base-content/75'}`
                  }
                >
                  <Icon className="size-5" /> {t(`app.${key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
          {plan?.price === 0 && (
            <div className="m-4 rounded-box border border-primary/30 bg-gradient-to-br from-primary/15 to-secondary/15 p-5">
              <p className="font-display font-semibold">Unlock premium signals</p>
              <p className="mt-1 text-xs text-base-content/70">More predictions per day, accuracy reports and live chat.</p>
              <Link to="/app/billing" onClick={closeDrawer} className="btn btn-primary btn-sm btn-block mt-4">Upgrade</Link>
            </div>
          )}
          <div className="border-t border-base-content/10 px-6 py-4 text-xs text-base-content/50">
            Need help? {contact.supportEmail || contact.email ? (
              <a className="link link-hover" href={`mailto:${contact.supportEmail || contact.email}`}>{contact.supportEmail || contact.email}</a>
            ) : (
              <Link className="link link-hover" to="/contact">Contact {siteName}</Link>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

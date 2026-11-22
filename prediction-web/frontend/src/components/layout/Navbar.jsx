import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';

const LINKS = [
  { to: '/', key: 'home', end: true },
  { to: '/tips', key: 'tips' },
  { to: '/pricing', key: 'pricing' },
  { to: '/about', key: 'about' },
  { to: '/contact', key: 'contact' },
];

export default function Navbar({ theme }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive ? 'bg-base-content/10 text-base-content' : 'text-base-content/70 hover:text-base-content'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${
        scrolled ? 'border-b border-base-content/10 bg-base-100/70 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between gap-4">
        <Logo isDark={theme.isDark} />

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {t(`nav.${l.key}`)}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle isDark={theme.isDark} setMode={theme.setMode} />
          {isAuthenticated ? (
            <Link to="/app" className="btn btn-primary btn-sm rounded-full hidden sm:inline-flex">
              <LayoutDashboard className="size-4" /> {t('nav.dashboard')}
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm rounded-full hidden sm:inline-flex">{t('nav.login')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm rounded-full hidden sm:inline-flex">{t('nav.register')}</Link>
            </>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-base-content/10 bg-base-100/95 backdrop-blur-xl md:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} onClick={() => setOpen(false)}>
                {t(`nav.${l.key}`)}
              </NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {isAuthenticated ? (
                <Link to="/app" className="btn btn-primary col-span-2" onClick={() => setOpen(false)}>{t('nav.dashboard')}</Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-ghost border-base-content/10" onClick={() => setOpen(false)}>{t('nav.login')}</Link>
                  <Link to="/register" className="btn btn-primary" onClick={() => setOpen(false)}>{t('nav.register')}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

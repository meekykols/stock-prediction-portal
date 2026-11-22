import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import PublicLayout from './components/layout/PublicLayout';
import AppLayout from './components/layout/AppLayout';
import SiteMeta from './components/layout/SiteMeta';
import ProtectedRoute from './components/routing/ProtectedRoute';
import GuestRoute from './components/routing/GuestRoute';
import PageLoader from './components/ui/PageLoader';
import Home from './pages/public/Home';
import { bootstrapSession } from './store/authSlice';
import { fetchSiteConfig } from './store/siteConfigSlice';

const Pricing = lazy(() => import('./pages/public/Pricing'));
const Tips = lazy(() => import('./pages/public/Tips'));
const AppTips = lazy(() => import('./pages/app/Tips'));
const BookingCodes = lazy(() => import('./pages/app/BookingCodes'));
const Contest = lazy(() => import('./pages/app/Contest'));
const CryptoSignals = lazy(() => import('./pages/app/CryptoSignals'));
const About = lazy(() => import('./pages/public/About'));
const Contact = lazy(() => import('./pages/public/Contact'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Overview = lazy(() => import('./pages/app/Overview'));
const MarketPredictions = lazy(() => import('./pages/app/MarketPredictions'));
const SportsPredictions = lazy(() => import('./pages/app/SportsPredictions'));
const Billing = lazy(() => import('./pages/app/Billing'));
const Settings = lazy(() => import('./pages/app/Settings'));
const History = lazy(() => import('./pages/app/History'));
const PredictionDetail = lazy(() => import('./pages/app/PredictionDetail'));
const BillingCallback = lazy(() => import('./pages/app/BillingCallback'));
const Signals = lazy(() => import('./pages/app/Signals'));
const SignalDetail = lazy(() => import('./pages/app/SignalDetail'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchSiteConfig());
    dispatch(bootstrapSession());
  }, [dispatch]);

  return (
    <>
      <SiteMeta />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="tips" element={<Tips />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          <Route path="app" element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Overview />} />
              <Route path="markets" element={<MarketPredictions />} />
              <Route path="stocks" element={<Navigate to="/app/markets" replace />} />
              <Route path="tips" element={<AppTips />} />
              <Route path="codes" element={<BookingCodes />} />
              <Route path="contest" element={<Contest />} />
              <Route path="crypto-signals" element={<CryptoSignals />} />
              <Route path="sports" element={<SportsPredictions />} />
              <Route path="signals" element={<Signals />} />
              <Route path="signals/:id" element={<SignalDetail />} />
              <Route path="history" element={<History />} />
              <Route path="predictions/:id" element={<PredictionDetail />} />
              <Route path="billing" element={<Billing />} />
              <Route path="billing/callback" element={<BillingCallback />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

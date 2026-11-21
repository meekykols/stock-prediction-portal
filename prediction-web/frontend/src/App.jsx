import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
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
const About = lazy(() => import('./pages/public/About'));
const Contact = lazy(() => import('./pages/public/Contact'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Overview = lazy(() => import('./pages/app/Overview'));
const StockPredictions = lazy(() => import('./pages/app/StockPredictions'));
const SportsPredictions = lazy(() => import('./pages/app/SportsPredictions'));
const Billing = lazy(() => import('./pages/app/Billing'));
const Settings = lazy(() => import('./pages/app/Settings'));
const History = lazy(() => import('./pages/app/History'));
const PredictionDetail = lazy(() => import('./pages/app/PredictionDetail'));

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
              <Route path="stocks" element={<StockPredictions />} />
              <Route path="sports" element={<SportsPredictions />} />
              <Route path="history" element={<History />} />
              <Route path="predictions/:id" element={<PredictionDetail />} />
              <Route path="billing" element={<Billing />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

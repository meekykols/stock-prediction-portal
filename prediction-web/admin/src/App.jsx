import { Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import AdminLayout from './components/layout/AdminLayout';
import PageLoader from './components/ui/PageLoader';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import { GuestOnly, HomeRedirect, RequirePermission, RequireStaff } from './routers/guards';
import { ROUTES } from './routers/routes';
import { bootstrapSession } from './store/authSlice';
import { fetchSiteConfig } from './store/siteConfigSlice';

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchSiteConfig());
    dispatch(bootstrapSession());
  }, [dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<RequireStaff />}>
          <Route element={<AdminLayout />}>
            {ROUTES.map((r) => {
              const page = <RequirePermission permission={r.permission}>{r.element}</RequirePermission>;
              return <Route key={r.path} path={r.path} element={r.path === '/' ? <HomeRedirect>{page}</HomeRedirect> : page} />;
            })}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Lock, LogIn, Mail } from 'lucide-react';
import AuthShell from './AuthShell';
import FormField from '../../components/ui/FormField';
import { login } from '../../store/authSlice';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function Login() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.signIn'));
  const { siteName } = useSiteConfig();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    const result = await dispatch(login(form));
    setSubmitting(false);
    if (login.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.user.firstName}`);
      navigate(location.state?.from?.pathname || '/app', { replace: true });
    } else {
      setErrors(result.payload?.fields || {});
      toast.error(result.payload?.message || 'Could not sign in');
    }
  };

  return (
    <AuthShell
      title={t('auth.welcomeBack')}
      subtitle={t('auth.loginSubtitle', { siteName })}
      footer={<>{t('auth.noAccount')} <Link to="/register" className="link link-primary font-medium">{t('nav.register')}</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-1">
        <FormField label={t('auth.email')} name="email" type="email" icon={Mail} value={form.email} onChange={onChange} error={errors.email} autoComplete="email" required autoFocus />
        <FormField label={t('auth.password')} name="password" type="password" icon={Lock} value={form.password} onChange={onChange} error={errors.password} autoComplete="current-password" required />
        <button type="submit" className="btn btn-primary btn-block mt-6" disabled={submitting}>
          {submitting ? <span className="loading loading-spinner loading-sm" /> : <LogIn className="size-4" />} {t('auth.signIn')}
        </button>
      </form>
    </AuthShell>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Lock, Mail, Phone, Rocket, User } from 'lucide-react';
import AuthShell from './AuthShell';
import FormField from '../../components/ui/FormField';
import { register } from '../../store/authSlice';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function Register() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.signUp'));
  const { siteName } = useSiteConfig();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const chosenPlan = params.get('plan');

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    const result = await dispatch(register(form));
    setSubmitting(false);
    if (register.fulfilled.match(result)) {
      toast.success(`Welcome to ${siteName}!`);
      const wantsPaid = chosenPlan && chosenPlan !== result.payload.subscription?.plan?.slug;
      navigate(wantsPaid ? `/app/billing?plan=${encodeURIComponent(chosenPlan)}` : '/app', { replace: true });
    } else {
      setErrors(result.payload?.fields || {});
      toast.error(result.payload?.message || 'Could not create account');
    }
  };

  return (
    <AuthShell
      title={t('auth.createAccount')}
      subtitle={t('auth.registerSubtitle', { siteName })}
      footer={<>{t('auth.haveAccount')} <Link to="/login" className="link link-primary font-medium">{t('auth.signIn')}</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-1">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField label={t('auth.firstName')} name="firstName" icon={User} value={form.firstName} onChange={onChange} error={errors.firstName} autoComplete="given-name" required autoFocus />
          <FormField label={t('auth.lastName')} name="lastName" value={form.lastName} onChange={onChange} error={errors.lastName} autoComplete="family-name" required />
        </div>
        <FormField label={t('auth.email')} name="email" type="email" icon={Mail} value={form.email} onChange={onChange} error={errors.email} autoComplete="email" required />
        <FormField label={t('auth.phone')} name="phone" type="tel" icon={Phone} value={form.phone} onChange={onChange} error={errors.phone} autoComplete="tel" />
        <FormField label={t('auth.password')} name="password" type="password" icon={Lock} value={form.password} onChange={onChange} error={errors.password} hint="At least 8 characters with a letter and a number" autoComplete="new-password" required />
        <button type="submit" className="btn btn-primary btn-block mt-6" disabled={submitting}>
          {submitting ? <span className="loading loading-spinner loading-sm" /> : <Rocket className="size-4" />} {t('auth.signUp')}
        </button>
      </form>
    </AuthShell>
  );
}

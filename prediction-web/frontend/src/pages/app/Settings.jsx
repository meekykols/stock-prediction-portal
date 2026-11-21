import { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Globe, KeyRound, Lock, Monitor, Moon, Phone, Save, Sun, User } from 'lucide-react';
import PageHeader from './PageHeader';
import FormField from '../../components/ui/FormField';
import { changePassword, updateProfile } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function ProfileForm({ user }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone || '', country: user.country || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await dispatch(updateProfile(form));
    setSaving(false);
    if (updateProfile.fulfilled.match(res)) { setErrors({}); toast.success('Profile updated'); }
    else { setErrors(res.payload?.fields || {}); toast.error(res.payload?.message || 'Could not save'); }
  };

  return (
    <form onSubmit={onSubmit} className="glass-card p-6" noValidate>
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="text-sm text-base-content/60">{user.email}</p>
      <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
        <FormField label="First name" name="firstName" icon={User} value={form.firstName} onChange={onChange} error={errors.firstName} />
        <FormField label="Last name" name="lastName" value={form.lastName} onChange={onChange} error={errors.lastName} />
        <FormField label="Phone" name="phone" type="tel" icon={Phone} value={form.phone} onChange={onChange} error={errors.phone} />
        <FormField label="Country" name="country" icon={Globe} value={form.country} onChange={onChange} error={errors.country} />
      </div>
      <button type="submit" className="btn btn-primary mt-4" disabled={saving}>
        {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="size-4" />} Save changes
      </button>
    </form>
  );
}

function PasswordForm() {
  const dispatch = useDispatch();
  const empty = { currentPassword: '', newPassword: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await dispatch(changePassword(form));
    setSaving(false);
    if (changePassword.fulfilled.match(res)) {
      setForm(empty); setErrors({});
      toast.success('Password changed. Other devices have been signed out.');
    } else {
      setErrors(res.payload?.fields || {});
      toast.error(res.payload?.message || 'Could not change password');
    }
  };

  return (
    <form onSubmit={onSubmit} className="glass-card p-6" noValidate>
      <h2 className="text-lg font-semibold">Password</h2>
      <p className="text-sm text-base-content/60">Changing it signs you out everywhere else.</p>
      <div className="mt-4">
        <FormField label="Current password" name="currentPassword" type="password" icon={Lock} value={form.currentPassword} onChange={onChange} error={errors.currentPassword} autoComplete="current-password" />
        <FormField label="New password" name="newPassword" type="password" icon={KeyRound} value={form.newPassword} onChange={onChange} error={errors.newPassword} hint="At least 8 characters with a letter and a number" autoComplete="new-password" />
      </div>
      <button type="submit" className="btn btn-primary mt-4" disabled={saving}>
        {saving && <span className="loading loading-spinner loading-sm" />} Update password
      </button>
    </form>
  );
}

function AppearanceCard() {
  const { mode, setMode } = useTheme();
  const options = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`btn h-auto flex-col gap-2 py-4 ${mode === value ? 'btn-primary btn-soft border-primary' : 'btn-ghost border-base-content/10'}`}
            aria-pressed={mode === value}
          >
            <Icon className="size-5" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  useDocumentTitle('Settings');
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, security and appearance." />
      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileForm user={user} />
        <div className="space-y-6">
          <AppearanceCard />
          <PasswordForm />
        </div>
      </div>
    </>
  );
}

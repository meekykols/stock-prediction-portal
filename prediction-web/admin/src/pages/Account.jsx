import { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { authApi } from '../api/endpoints';
import { errorMessage, fieldErrors, setAccessToken } from '../api/client';
import PageHeader from '../components/ui/PageHeader';
import FormField from '../components/ui/FormField';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { userUpdated } from '../store/authSlice';
import { PERMISSION_LABELS } from '../routers/permissions';

export default function Account() {
  useDocumentTitle('My account');
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [profile, setProfile] = useState({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    try { const d = await authApi.updateProfile(profile); dispatch(userUpdated(d.user)); toast.success('Profile saved'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(null); }
  };
  const savePassword = async (e) => {
    e.preventDefault();
    setBusy('pw');
    setErrors({});
    try {
      const d = await authApi.changePassword(pw);
      setAccessToken(d.accessToken);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed. Other sessions were signed out.');
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="My account" subtitle={user.email} />
      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={saveProfile} className="glass-card p-6">
          <h2 className="font-semibold">Profile</h2>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField label="First name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            <FormField label="Last name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            <FormField label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm mt-4" disabled={busy === 'profile'}>Save profile</button>
        </form>
        <form onSubmit={savePassword} className="glass-card p-6">
          <h2 className="font-semibold">Change password</h2>
          <FormField label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={errors.currentPassword} />
          <FormField label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={errors.newPassword} hint="At least 8 characters with a letter and a number" />
          <button type="submit" className="btn btn-primary btn-sm mt-4" disabled={busy === 'pw'}>Update password</button>
        </form>
        <div className="glass-card p-6 xl:col-span-2">
          <h2 className="font-semibold">Your access</h2>
          {user.role === 'superadmin' ? <p className="mt-2 text-sm text-base-content/70">Superadmin: full access to everything.</p> : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {user.permissions.length ? user.permissions.map((p) => <li key={p} className="badge badge-ghost">{PERMISSION_LABELS[p] || p}</li>) : <li className="text-sm text-base-content/60">No permissions yet. Ask a superadmin.</li>}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Lock, LogIn, Mail } from 'lucide-react';
import { LogoMark } from '../components/ui/Logo';
import { login } from '../store/authSlice';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Login() {
  useDocumentTitle('Sign in');
  const { siteName } = useSiteConfig();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await dispatch(login(form));
    setBusy(false);
    if (login.rejected.match(res)) {
      setError(res.payload?.message || 'Could not sign in');
      toast.error(res.payload?.message || 'Could not sign in');
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="bg-grid absolute inset-0" />
      <div className="glow-orb -left-24 top-10 size-96 bg-primary/20" />
      <div className="glow-orb -right-24 bottom-0 size-96 bg-secondary/20" />
      <form onSubmit={onSubmit} className="glass-card relative w-full max-w-sm p-8" noValidate>
        <div className="flex flex-col items-center text-center">
          <LogoMark className="size-12" />
          <h1 className="mt-4 text-2xl font-bold">{siteName} Admin</h1>
          <p className="mt-1 text-sm text-base-content/60">Staff sign-in</p>
        </div>
        <div className="mt-8 space-y-3">
          <label className="input w-full"><Mail className="size-4 opacity-50" />
            <input type="email" placeholder="Email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus aria-label="Email" />
          </label>
          <label className="input w-full"><Lock className="size-4 opacity-50" />
            <input type="password" placeholder="Password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required aria-label="Password" />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : <LogIn className="size-4" />} Sign in
          </button>
        </div>
      </form>
    </div>
  );
}

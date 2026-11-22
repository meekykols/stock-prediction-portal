import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, KeyRound, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';
import StatusBadge from '../components/ui/StatusBadge';
import UserCell from '../components/ui/UserCell';
import { usersApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ASSIGNABLE, PERMISSION_LABELS } from '../routers/permissions';
import { formatDateTime } from '../utils/format';

function PermissionPicker({ value, onChange }) {
  const toggle = (p) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ASSIGNABLE.map((p) => (
        <label key={p} className="label cursor-pointer justify-start gap-3 rounded-field border border-base-content/10 px-3 py-2 text-sm">
          <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={value.includes(p)} onChange={() => toggle(p)} />
          <span className="whitespace-normal">{PERMISSION_LABELS[p]}</span>
        </label>
      ))}
    </div>
  );
}

function StaffModal({ member, onClose, onSaved }) {
  const isNew = member && !member.id;
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', permissions: [] });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (member) { setForm({ firstName: '', lastName: '', email: '', password: '', permissions: member.permissions || [] }); setErrors({}); }
  }, [member]);

  const save = async () => {
    setBusy(true);
    try {
      if (isNew) await usersApi.createStaff(form);
      else await usersApi.update(member.id, { permissions: form.permissions });
      toast.success(isNew ? 'Staff account created' : 'Permissions updated');
      onSaved();
      onClose();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={Boolean(member)} onClose={onClose} size="max-w-2xl" title={isNew ? 'Add staff member' : `Permissions for ${member?.firstName ?? ''}`}
      actions={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}{isNew ? 'Create account' : 'Save permissions'}</button></>}>
      {isNew && (
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={errors.firstName} />
          <FormField label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={errors.lastName} />
          <FormField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <FormField label="Temporary password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} hint="At least 10 characters. Ask them to change it after signing in." />
        </div>
      )}
      <p className="mb-2 mt-4 text-sm font-medium">What can they do?</p>
      <PermissionPicker value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
    </Modal>
  );
}

export default function Staff() {
  useDocumentTitle('Staff');
  const { user: me } = useAuth();
  const [staff, setStaff] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => usersApi.list({ role: 'staff', limit: 100 }).then((d) => setStaff(d.items)).catch((e) => toast.error(errorMessage(e))), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (m) => {
    try {
      await usersApi.update(m.id, { status: m.status === 'active' ? 'suspended' : 'active' });
      toast.success(m.status === 'active' ? `${m.firstName} can no longer sign in` : `${m.firstName} reactivated`);
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <>
      <PageHeader title="Staff" subtitle="Who can use this console and what they can do. Only superadmins see this page."
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}><Plus className="size-4" /> Add staff</button>} />
      {!staff ? <div className="skeleton h-64 rounded-box" /> : (
        <div className="glass-card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Member</th><th>Role</th><th>Access</th><th className="hidden md:table-cell">Last sign-in</th><th /></tr></thead>
            <tbody>
              {staff.map((m) => (
                <tr key={m.id}>
                  <td><UserCell user={m} link={false} /></td>
                  <td><span className={`badge badge-sm ${m.role === 'superadmin' ? 'badge-secondary' : 'badge-ghost'}`}>{m.role}</span> {m.status !== 'active' && <StatusBadge status={m.status} />}</td>
                  <td className="text-sm text-base-content/70">{m.role === 'superadmin' ? 'Everything' : `${m.permissions.length} permission${m.permissions.length === 1 ? '' : 's'}`}</td>
                  <td className="hidden text-sm md:table-cell">{formatDateTime(m.lastLoginAt)}</td>
                  <td className="text-right">
                    {m.role === 'staff' && m.id !== me?.id && (
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(m)}><KeyRound className="size-3.5" /> Permissions</button>
                        <button type="button" className={`btn btn-ghost btn-xs ${m.status === 'active' ? 'text-error' : 'text-success'}`} onClick={() => toggle(m)}>
                          {m.status === 'active' ? <><Ban className="size-3.5" /> Suspend</> : <><RotateCcw className="size-3.5" /> Reactivate</>}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-base-content/50"><ShieldCheck className="size-4" /> Superadmins are created from the server with <code className="font-mono">npm run create-admin</code>.</p>
      <StaffModal member={editing} onClose={() => setEditing(null)} onSaved={load} />
    </>
  );
}

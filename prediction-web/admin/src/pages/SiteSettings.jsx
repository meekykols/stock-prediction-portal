import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { ImageUp, Save } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import FormField from '../components/ui/FormField';
import { settingsApi } from '../api/endpoints';
import { errorMessage, fieldErrors } from '../api/client';
import { siteConfigUpdated } from '../store/siteConfigSlice';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TABS = ['General', 'Contact', 'Social', 'SEO & legal', 'Announcement', 'Branding'];
const SOCIALS = [['x', 'X (Twitter)'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['telegram', 'Telegram'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn'], ['tiktok', 'TikTok']];

function ImageSlot({ field, label, hint, image, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const config = await settingsApi.uploadImage(field, file);
      onUploaded(config);
      toast.success(`${label} updated`);
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <div className="glass-card flex items-center gap-4 p-4">
      <div className="grid size-16 shrink-0 place-items-center rounded-field border border-base-content/10 bg-base-100">
        {image?.url ? <img src={image.url} alt="" className="max-h-12 max-w-12 object-contain" /> : <ImageUp className="size-6 text-base-content/30" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-base-content/60">{hint}</p>
      </div>
      <label className={`btn btn-sm ${busy ? 'btn-disabled' : ''}`}>
        {busy ? <span className="loading loading-spinner loading-xs" /> : 'Upload'}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
    </div>
  );
}

export default function SiteSettings() {
  useDocumentTitle('Site settings');
  const dispatch = useDispatch();
  const [tab, setTab] = useState(TABS[0]);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { settingsApi.get().then(setForm).catch((e) => toast.error(errorMessage(e))); }, []);
  if (!form) return <div className="skeleton h-96 rounded-box" />;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setIn = (group, key, value) => setForm((f) => ({ ...f, [group]: { ...(f[group] || {}), [key]: value } }));
  const err = (path) => errors[path];

  const save = async () => {
    setSaving(true);
    setErrors({});
    const { siteName, tagline, description, contact, socials, currency, seo, legal, announcement, maintenanceMode } = form;
    try {
      const res = await settingsApi.update({ siteName, tagline, description, contact, socials, currency, seo, legal, announcement, maintenanceMode });
      setForm(res.data);
      dispatch(siteConfigUpdated(res.data));
      toast.success('Settings saved. The website picks them up within a minute.');
    } catch (e) {
      setErrors(fieldErrors(e));
      toast.error(errorMessage(e));
    } finally { setSaving(false); }
  };

  const onUploaded = (config) => { setForm((f) => ({ ...f, logo: config.logo, logoDark: config.logoDark, favicon: config.favicon })); dispatch(siteConfigUpdated(config)); };

  return (
    <>
      <PageHeader title="Site settings" subtitle="Name, contact details and branding used across the website, emails and this console."
        actions={tab !== 'Branding' && <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="size-4" />} Save changes</button>} />

      <div role="tablist" className="tabs tabs-box mb-6 w-full overflow-x-auto sm:w-fit">
        {TABS.map((t) => <button key={t} type="button" role="tab" className={`tab whitespace-nowrap ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)} aria-selected={tab === t}>{t}</button>)}
      </div>

      <div className="glass-card max-w-3xl p-6">
        {tab === 'General' && (
          <>
            <FormField label="Site name" value={form.siteName || ''} onChange={(e) => set('siteName', e.target.value)} error={err('siteName')} hint="Shown in the header, footer, page titles and emails" />
            <FormField label="Tagline" value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} error={err('tagline')} />
            <FormField as="textarea" rows={3} label="Description" value={form.description || ''} onChange={(e) => set('description', e.target.value)} error={err('description')} hint="Used in the footer and About page" />
            <div className="grid gap-x-4 sm:grid-cols-3">
              <FormField label="Currency code" value={form.currency?.code || ''} onChange={(e) => setIn('currency', 'code', e.target.value.toUpperCase())} />
              <FormField label="Symbol" value={form.currency?.symbol || ''} onChange={(e) => setIn('currency', 'symbol', e.target.value)} />
              <FormField label="Locale" value={form.currency?.locale || ''} onChange={(e) => setIn('currency', 'locale', e.target.value)} hint="e.g. en-NG" />
            </div>
          </>
        )}
        {tab === 'Contact' && (
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField label="General email" type="email" value={form.contact?.email || ''} onChange={(e) => setIn('contact', 'email', e.target.value)} error={err('contact.email')} />
            <FormField label="Support email" type="email" value={form.contact?.supportEmail || ''} onChange={(e) => setIn('contact', 'supportEmail', e.target.value)} error={err('contact.supportEmail')} />
            <FormField label="Phone" value={form.contact?.phone || ''} onChange={(e) => setIn('contact', 'phone', e.target.value)} />
            <FormField label="WhatsApp number" value={form.contact?.whatsapp || ''} onChange={(e) => setIn('contact', 'whatsapp', e.target.value)} hint="International format, e.g. +234…" />
            <FormField label="Address" value={form.contact?.address || ''} onChange={(e) => setIn('contact', 'address', e.target.value)} className="sm:col-span-2" />
            <FormField label="Support hours" value={form.contact?.supportHours || ''} onChange={(e) => setIn('contact', 'supportHours', e.target.value)} className="sm:col-span-2" />
          </div>
        )}
        {tab === 'Social' && (
          <div className="grid gap-x-4 sm:grid-cols-2">
            {SOCIALS.map(([k, label]) => (
              <FormField key={k} label={label} type="url" placeholder="https://…" value={form.socials?.[k] || ''} onChange={(e) => setIn('socials', k, e.target.value)} error={err(`socials.${k}`)} />
            ))}
            <p className="text-xs text-base-content/50 sm:col-span-2">Only filled-in networks are shown on the site.</p>
          </div>
        )}
        {tab === 'SEO & legal' && (
          <>
            <FormField label="Default page title" value={form.seo?.title || ''} onChange={(e) => setIn('seo', 'title', e.target.value)} />
            <FormField as="textarea" rows={2} label="Meta description" value={form.seo?.description || ''} onChange={(e) => setIn('seo', 'description', e.target.value)} hint="Shown by search engines; about 150 characters" />
            <FormField label="Keywords (comma separated)" value={(form.seo?.keywords || []).join(', ')} onChange={(e) => setIn('seo', 'keywords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField label="Company name" value={form.legal?.companyName || ''} onChange={(e) => setIn('legal', 'companyName', e.target.value)} hint="Used in the © line" />
              <FormField label="Registration number" value={form.legal?.registrationNumber || ''} onChange={(e) => setIn('legal', 'registrationNumber', e.target.value)} />
            </div>
            <FormField as="textarea" rows={3} label="Disclaimer" value={form.legal?.disclaimer || ''} onChange={(e) => setIn('legal', 'disclaimer', e.target.value)} hint="Shown in the footer and next to every prediction" />
          </>
        )}
        {tab === 'Announcement' && (
          <>
            <label className="label cursor-pointer justify-start gap-3"><input type="checkbox" className="toggle toggle-primary" checked={Boolean(form.announcement?.enabled)} onChange={(e) => setIn('announcement', 'enabled', e.target.checked)} /> Show announcement bar</label>
            <FormField label="Text" value={form.announcement?.text || ''} onChange={(e) => setIn('announcement', 'text', e.target.value)} placeholder="e.g. 20% off Pro this week" />
            <FormField label="Link (optional)" type="url" value={form.announcement?.link || ''} onChange={(e) => setIn('announcement', 'link', e.target.value)} error={err('announcement.link')} />
            <div className="divider" />
            <label className="label cursor-pointer justify-start gap-3"><input type="checkbox" className="toggle toggle-warning" checked={Boolean(form.maintenanceMode)} onChange={(e) => set('maintenanceMode', e.target.checked)} /> Maintenance banner</label>
            <p className="mt-1 text-xs text-base-content/60">Shows a maintenance notice across the site. It does not block sign-ins or payments.</p>
          </>
        )}
        {tab === 'Branding' && (
          <div className="space-y-3">
            <ImageSlot field="logo" label="Logo (light backgrounds)" hint="PNG, SVG or WEBP, up to 2 MB" image={form.logo} onUploaded={onUploaded} />
            <ImageSlot field="logoDark" label="Logo (dark backgrounds)" hint="Used in the dark theme; falls back to the main logo" image={form.logoDark} onUploaded={onUploaded} />
            <ImageSlot field="favicon" label="Favicon" hint="Square, 32×32 or larger" image={form.favicon} onUploaded={onUploaded} />
            <p className="text-xs text-base-content/50">Uploads need Cloudinary keys in the backend .env.</p>
          </div>
        )}
      </div>
    </>
  );
}

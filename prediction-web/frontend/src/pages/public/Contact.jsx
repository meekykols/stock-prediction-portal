import { useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, Mail, MapPin, MessageCircle, Phone, Send, User } from 'lucide-react';
import SectionHeading from '../../components/ui/SectionHeading';
import FormField from '../../components/ui/FormField';
import SocialLinks from '../../components/ui/SocialLinks';
import { publicApi } from '../../api/endpoints';
import { errorMessage, fieldErrors } from '../../api/client';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../hooks/useAuth';
import { telHref, waHref } from '../../utils/format';

export default function Contact() {
  useDocumentTitle('Contact');
  const { siteName, contact } = useSiteConfig();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setErrors({});
    try {
      const res = await publicApi.contact(form);
      toast.success(res.message);
      setForm((f) => ({ ...f, subject: '', message: '' }));
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const cards = [
    contact.email && { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    contact.supportEmail && contact.supportEmail !== contact.email && { icon: Mail, label: 'Support', value: contact.supportEmail, href: `mailto:${contact.supportEmail}` },
    contact.phone && { icon: Phone, label: 'Phone', value: contact.phone, href: telHref(contact.phone) },
    contact.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: contact.whatsapp, href: waHref(contact.whatsapp) },
    contact.address && { icon: MapPin, label: 'Office', value: contact.address },
    contact.supportHours && { icon: Clock, label: 'Hours', value: contact.supportHours },
  ].filter(Boolean);

  return (
    <div className="relative">
      <div className="bg-grid absolute inset-x-0 top-0 -z-10 h-[28rem]" />
      <section className="container-x pt-16 pb-12">
        <SectionHeading eyebrow="Contact" title={`Get in touch with ${siteName}`} subtitle="Questions about plans, predictions or your account? We usually reply within one business day." />
      </section>

      <section className="container-x grid gap-8 pb-12 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {cards.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="glass-card flex items-start gap-4 p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Icon className="size-5" /></div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-base-content/50">{label}</p>
                {href ? <a href={href} className="link link-hover break-words font-medium">{value}</a> : <p className="font-medium">{value}</p>}
              </div>
            </div>
          ))}
          <SocialLinks />
        </div>

        <form onSubmit={onSubmit} className="glass-card space-y-2 p-6 sm:p-8 lg:col-span-3" noValidate>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField label="Name" name="name" icon={User} value={form.name} onChange={onChange} error={errors.name} required autoComplete="name" />
            <FormField label="Email" name="email" type="email" icon={Mail} value={form.email} onChange={onChange} error={errors.email} required autoComplete="email" />
          </div>
          <FormField label="Subject" name="subject" value={form.subject} onChange={onChange} error={errors.subject} />
          <FormField label="Message" name="message" as="textarea" rows={6} value={form.message} onChange={onChange} error={errors.message} required />
          <button type="submit" className="btn btn-primary mt-4 w-full sm:w-auto" disabled={sending}>
            {sending ? <span className="loading loading-spinner loading-sm" /> : <Send className="size-4" />} Send message
          </button>
        </form>
      </section>
    </div>
  );
}

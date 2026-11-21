import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import Logo from '../ui/Logo';
import SocialLinks from '../ui/SocialLinks';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { telHref } from '../../utils/format';

export default function Footer({ isDark }) {
  const { t } = useTranslation();
  const { siteName, description, tagline, contact, legal } = useSiteConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-base-content/10 bg-base-200/40">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2 max-w-sm">
          <Logo isDark={isDark} />
          <p className="mt-4 text-sm text-base-content/70">{description || tagline}</p>
          <SocialLinks className="mt-6" />
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-base-content/50">{t('footer.product')}</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link className="link link-hover" to="/pricing">{t('nav.pricing')}</Link></li>
            <li><Link className="link link-hover" to="/register">{t('nav.register')}</Link></li>
            <li><Link className="link link-hover" to="/about">{t('nav.about')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-base-content/50">{t('footer.contact')}</h4>
          <ul className="mt-4 space-y-3 text-sm text-base-content/80">
            {contact.email && (
              <li className="flex gap-2"><Mail className="size-4 mt-0.5 text-primary" /><a className="link link-hover" href={`mailto:${contact.email}`}>{contact.email}</a></li>
            )}
            {contact.phone && (
              <li className="flex gap-2"><Phone className="size-4 mt-0.5 text-primary" /><a className="link link-hover" href={telHref(contact.phone)}>{contact.phone}</a></li>
            )}
            {contact.address && (
              <li className="flex gap-2"><MapPin className="size-4 mt-0.5 text-primary" />{contact.address}</li>
            )}
            {contact.supportHours && (
              <li className="flex gap-2"><Clock className="size-4 mt-0.5 text-primary" />{contact.supportHours}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-base-content/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-base-content/50 md:flex-row md:items-start md:justify-between">
          <p>© {year} {legal.companyName || siteName}. {t('footer.rights')}</p>
          {legal.disclaimer && <p className="max-w-2xl md:text-right">{legal.disclaimer}</p>}
        </div>
      </div>
    </footer>
  );
}

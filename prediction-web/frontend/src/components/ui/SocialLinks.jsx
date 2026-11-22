import { useSiteConfig } from '../../hooks/useSiteConfig';

const LABELS = {
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  telegram: 'Telegram',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

/** Renders only the networks configured in site config. */
export default function SocialLinks({ className = '' }) {
  const { socials } = useSiteConfig();
  const entries = Object.entries(LABELS).filter(([key]) => socials[key]);
  if (!entries.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {entries.map(([key, label]) => (
        <a
          key={key}
          href={socials[key]}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-xs btn-ghost border border-base-content/10 rounded-full"
        >
          {label}
        </a>
      ))}
    </div>
  );
}

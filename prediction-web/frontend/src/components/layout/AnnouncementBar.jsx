import { Megaphone, Wrench } from 'lucide-react';
import { useSiteConfig } from '../../hooks/useSiteConfig';

export default function AnnouncementBar() {
  const { announcement, maintenanceMode, siteName } = useSiteConfig();

  if (maintenanceMode) {
    return (
      <div className="bg-warning text-warning-content">
        <div className="container-x flex items-center justify-center gap-2 py-2 text-sm font-medium">
          <Wrench className="size-4" /> {siteName} is undergoing scheduled maintenance. Some features may be unavailable.
        </div>
      </div>
    );
  }

  if (!announcement.enabled || !announcement.text) return null;
  const content = (
    <span className="inline-flex items-center gap-2">
      <Megaphone className="size-4" /> {announcement.text}
    </span>
  );
  return (
    <div className="bg-gradient-to-r from-primary via-info to-secondary text-primary-content">
      <div className="container-x py-2 text-center text-sm font-medium">
        {announcement.link ? <a href={announcement.link} className="hover:underline">{content}</a> : content}
      </div>
    </div>
  );
}

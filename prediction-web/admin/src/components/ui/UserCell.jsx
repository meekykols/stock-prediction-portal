import { Link } from 'react-router-dom';
import { fullName, initials } from '../../utils/format';

export default function UserCell({ user, link = true }) {
  if (!user) return <span className="text-base-content/40">Deleted user</span>;
  const body = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="avatar avatar-placeholder">
        <div className="w-8 rounded-full bg-base-300 text-xs font-semibold">
          {user.avatar?.url ? <img src={user.avatar.url} alt="" /> : <span>{initials(user)}</span>}
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{fullName(user)}</p>
        <p className="truncate text-xs text-base-content/50">{user.email}</p>
      </div>
    </div>
  );
  return link && user.id ? <Link to={`/users/${user.id}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>{body}</Link> : body;
}

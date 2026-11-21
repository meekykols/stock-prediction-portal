import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { errorMessage } from '../api/client';

/** Shows a toast for a failed prediction; quota errors get an upgrade link. */
export function toastPredictionError(err) {
  const message = errorMessage(err);
  if (err?.response?.data?.code === 'quota_exceeded') {
    toast.error(
      (t) => (
        <span className="text-sm">
          {message}{' '}
          <Link to="/app/billing" className="link link-primary font-medium" onClick={() => toast.dismiss(t.id)}>
            See plans
          </Link>
        </span>
      ),
      { duration: 8000 },
    );
  } else {
    toast.error(message);
  }
}

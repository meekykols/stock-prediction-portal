import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <p className="font-display text-6xl font-bold text-gradient">404</p>
        <p className="mt-2 text-base-content/60">That page doesn&apos;t exist.</p>
        <Link to="/" className="btn btn-primary btn-sm mt-6">Back to console</Link>
      </div>
    </div>
  );
}

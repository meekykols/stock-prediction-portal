import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <section className="container-x grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="font-display text-8xl font-bold text-gradient">404</p>
        <h1 className="mt-4 text-2xl font-semibold">This page drifted out of range</h1>
        <p className="mt-2 text-base-content/60">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="btn btn-primary mt-8 rounded-full">Back home</Link>
      </div>
    </section>
  );
}

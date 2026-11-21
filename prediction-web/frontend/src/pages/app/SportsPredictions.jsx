import { Trophy } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function SportsPredictions() {
  useDocumentTitle('Sports predictions');
  return (
    <>
      <PageHeader title="Sports predictions" subtitle="Model-backed outlooks for upcoming fixtures." />
      <div role="tablist" className="tabs tabs-box mb-6 w-fit">
        <button type="button" role="tab" className="tab tab-active">Football</button>
        <button type="button" role="tab" className="tab" disabled>More sports soon</button>
      </div>
      <EmptyState icon={Trophy} title="Fixtures are on their way">
        Upcoming matches with win, draw and loss probabilities will appear here once the sports model service goes live.
      </EmptyState>
    </>
  );
}

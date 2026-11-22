import PageHeader from './PageHeader';
import TipsBoard from '../../components/tips/TipsBoard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function AppTips() {
  useDocumentTitle('Daily tips');
  return (
    <>
      <PageHeader title="Daily tips" subtitle="Model picks for today and tomorrow, settled automatically after each match." />
      <TipsBoard inApp />
    </>
  );
}

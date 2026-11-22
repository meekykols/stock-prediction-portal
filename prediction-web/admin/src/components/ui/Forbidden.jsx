import { ShieldX } from 'lucide-react';
import EmptyState from './EmptyState';

export default function Forbidden() {
  return (
    <EmptyState icon={ShieldX} title="You don't have access to this page">
      Ask a superadmin to give your account the permission for this section.
    </EmptyState>
  );
}

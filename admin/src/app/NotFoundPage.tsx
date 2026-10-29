import { Link } from 'react-router';
import { Empty } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <Empty>
      This page doesn&apos;t exist. <Link to="/" className="text-brand-700 underline">Back to the dashboard</Link>
    </Empty>
  );
}

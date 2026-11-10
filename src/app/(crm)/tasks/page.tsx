import type { Metadata } from 'next';
import PlaceholderPage from '@/components/layouts/placeholder-page';

export const metadata: Metadata = { title: 'Tasks' };

export default function Page() {
  return (
    <PlaceholderPage
      title="Tasks"
      description="Follow-ups and reminders will live here."
    />
  );
}

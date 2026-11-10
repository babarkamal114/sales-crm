import { ContentPanel } from '@/components/layouts/app-header';
import { EmptyState } from '@/components/ui/feedback';

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <ContentPanel>
      <EmptyState title={title} description={description} />
    </ContentPanel>
  );
}

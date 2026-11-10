import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Inset } from '@/components/ui/inset';
import { StatusPill } from '@/components/ui/status-pill';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/feedback';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

export default function ComponentsPreviewPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const statuses = [
    'Won',
    'Lost',
    'Open',
    'Paid',
    'Due soon',
    'Overdue',
    'Delivered',
    'Failed',
    'DND',
    'Pending',
    'Internal',
  ] as const;

  return (
    <div className="app-shell min-h-dvh p-6 sm:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">
            Component preview
          </h1>
          <p className="mt-1 text-[14px] text-ink-500">
            Development only. Compare against Sponsoro compliance UI.
          </p>
        </div>

        <Panel>
          <h2 className="mb-4 text-[17px] font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Danger</Button>
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-[17px] font-semibold">Status pills</h2>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <StatusPill key={status} status={status} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone="clear">Clear</StatusBadge>
            <StatusBadge tone="risk">Risk</StatusBadge>
            <StatusBadge tone="action">Action</StatusBadge>
            <StatusBadge tone="brand">Brand</StatusBadge>
            <Badge tone="mint">Mint</Badge>
            <Badge tone="amber">Amber</Badge>
            <Badge tone="rose">Rose</Badge>
          </div>
        </Panel>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] text-ink-500">
                Solid white card with line border.
              </p>
            </CardContent>
          </Card>
          <Inset>
            <p className="text-[13px] text-ink-500">
              Inset surface for composers and quoted content.
            </p>
          </Inset>
        </div>

        <Panel>
          <h2 className="mb-4 text-[17px] font-semibold">Form controls</h2>
          <div className="max-w-sm space-y-3">
            <Input placeholder="Input with soft fill" />
            <div className="flex items-center gap-4">
              <Switch />
              <Checkbox label="Checkbox" name="preview-check" />
            </div>
          </div>
        </Panel>

        <Panel>
          <EmptyState
            title="Empty state"
            description="Use for lists with no records yet."
          />
          <div className="mt-6">
            <ErrorState
              title="Error state"
              description="Something failed. Offer a retry."
              onRetry={() => undefined}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

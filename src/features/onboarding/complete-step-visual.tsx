import { CheckCircle2, LayoutDashboard, TrendingUp } from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    detail: 'Renewals, pipeline value, and tasks at a glance.',
  },
  {
    icon: TrendingUp,
    title: 'Opportunities',
    detail: 'Move sponsors through your stages with full history.',
  },
] as const;

export function CompleteStepVisual() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center rounded-xl2 border border-mint-100 bg-gradient-to-b from-mint-50/80 to-white px-6 py-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-mint-100 ring-4 ring-mint-50">
          <CheckCircle2 className="size-9 text-mint-600" strokeWidth={1.75} />
        </span>
        <p className="mt-4 text-[15px] font-bold text-ink-900">
          Your workspace is ready
        </p>
        <p className="mt-1 max-w-sm text-[13px] font-medium text-ink-500">
          Required setup is complete. Optional steps stay on your getting-started
          checklist.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.title}
              className="flex gap-3 rounded-xl2 border border-line/60 bg-white p-4 shadow-chip"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <Icon className="size-5 text-brand-600" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[13px] font-bold text-ink-900">{item.title}</p>
                <p className="mt-0.5 text-[12px] font-medium text-ink-500">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

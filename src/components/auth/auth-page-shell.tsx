import type { ReactNode } from 'react';
import { AuthUnifiedShell } from '@/components/auth/auth-layout';
import { crmBrandPanelContent } from '@/lib/auth/brand-panel-content';

/** Server-rendered auth chrome so marketing panel paints before client form hydration. */
export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <AuthUnifiedShell brandContent={crmBrandPanelContent}>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-start px-5 py-6 sm:justify-center sm:px-10 sm:py-10 xl:px-14 xl:py-12">
          {children}
        </div>
      </div>
    </AuthUnifiedShell>
  );
}

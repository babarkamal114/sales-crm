'use client';

export function SetupPanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-line/40 bg-gradient-to-b from-brand-50/25 via-soft/20 to-white px-5 py-6 sm:px-7 sm:py-7">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 transition-opacity duration-300">
        {children}
      </div>
    </div>
  );
}

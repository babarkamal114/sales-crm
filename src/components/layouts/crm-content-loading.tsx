/** Lightweight placeholder while a CRM route segment loads (not a full dashboard skeleton). */
export function CrmContentLoading() {
  return (
    <div
      className="space-y-4 rounded-xl3 border border-white bg-white/70 p-6 shadow-panel backdrop-blur-sm"
      aria-busy
      aria-label="Loading page"
    >
      <div className="h-6 w-40 animate-pulse rounded-full bg-soft" />
      <div className="h-20 animate-pulse rounded-xl2 bg-soft" />
    </div>
  );
}

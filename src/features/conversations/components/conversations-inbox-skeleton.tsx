export function ConversationsInboxSkeleton() {
  return (
    <div className="grid h-full min-h-[420px] flex-1 animate-pulse grid-cols-1 md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(260px,300px)]">
      <div className="border-line md:border-r">
        <div className="space-y-2.5 border-b border-line/80 p-3 sm:p-4">
          <div className="h-8 rounded-xl bg-soft" />
          <div className="h-9 rounded-xl bg-soft" />
          <div className="h-6 w-full rounded-lg bg-soft" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b border-line px-4 py-3">
            <div className="size-10 shrink-0 rounded-full bg-soft" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-soft" />
              <div className="h-3 w-full rounded bg-soft" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden flex-col md:flex">
        <div className="h-16 border-b border-line bg-soft/50" />
        <div className="flex-1 bg-soft/30" />
      </div>
    </div>
  );
}

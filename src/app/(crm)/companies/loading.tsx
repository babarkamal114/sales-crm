export default function Loading() {
  return (
    <div className="space-y-4 rounded-xl3 border border-white bg-white/70 p-6 shadow-panel backdrop-blur-sm">
      <div className="h-6 w-40 animate-pulse rounded-full bg-soft" />
      <div className="h-24 animate-pulse rounded-xl2 bg-soft" />
      <div className="h-24 animate-pulse rounded-xl2 bg-soft" />
    </div>
  );
}

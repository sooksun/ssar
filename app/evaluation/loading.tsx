export default function Loading() {
  return (
    <div className="container mx-auto p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

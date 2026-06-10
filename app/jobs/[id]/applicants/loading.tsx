export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="bg-border h-7 w-56 animate-pulse rounded" />
      <div className="bg-border mt-3 h-4 w-40 animate-pulse rounded" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-border h-16 animate-pulse rounded-xl border-2"
          />
        ))}
      </div>
    </div>
  );
}

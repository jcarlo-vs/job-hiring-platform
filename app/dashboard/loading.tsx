export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="bg-border h-8 w-48 animate-pulse rounded" />
      <div className="mt-10 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-border h-20 animate-pulse rounded-md border"
          />
        ))}
      </div>
    </div>
  );
}

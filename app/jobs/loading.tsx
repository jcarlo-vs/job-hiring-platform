export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="bg-border h-7 w-40 animate-pulse rounded" />
      <div className="bg-border mt-6 h-24 w-full animate-pulse rounded-lg" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-border h-36 animate-pulse rounded-lg border"
          />
        ))}
      </div>
    </div>
  );
}

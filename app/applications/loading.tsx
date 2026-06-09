export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="bg-border h-7 w-44 animate-pulse rounded" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-border h-16 animate-pulse rounded-md border"
          />
        ))}
      </div>
    </div>
  );
}

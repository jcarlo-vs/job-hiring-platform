"use client";

// Root catch-all error boundary. Covers any route without a closer error.tsx
// (dashboard, applications, account, auth pages). /jobs has its own.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted mt-2 text-sm">
        An unexpected error occurred. Please try again.
      </p>
      <button onClick={() => reset()} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}

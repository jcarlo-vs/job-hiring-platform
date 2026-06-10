import Link from "next/link";

/** Pill back-link with a chevron, used for "< All jobs", "< Dashboard", etc. */
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="border-border text-muted hover:text-foreground hover:border-primary inline-flex items-center gap-1 rounded-full border-2 bg-white py-1.5 pr-4 pl-2.5 text-sm font-semibold transition-colors"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="h-4 w-4 shrink-0"
      >
        <path
          d="M12 5l-5 5 5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </Link>
  );
}

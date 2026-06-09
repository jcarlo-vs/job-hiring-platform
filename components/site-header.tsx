import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Talent<span className="text-primary">Screen</span>
        </Link>
        <nav className="text-muted flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";

import { THEMES } from "@/lib/themes";

export default function ThemesIndex() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Theme options</h1>
      <p className="text-muted mt-2 max-w-2xl text-sm">
        Five distinct directions for the job board. Each is a full, hand-built
        mock of the jobs page with its own layout and vibe (not just recolored).
        Open one, use the switcher bar to compare, then tell me which to apply.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {THEMES.map((t) => (
          <Link
            key={t.slug}
            href={`/themes/${t.slug}`}
            className="border-border hover:border-primary block overflow-hidden rounded-lg border transition-colors"
          >
            <div
              className="flex h-20 items-center justify-center"
              style={{ background: t.bg }}
            >
              <span
                className="h-10 w-10 rounded-md"
                style={{
                  background: t.swatch,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
            </div>
            <div className="border-border border-t p-5">
              <h2 className="font-medium">{t.name}</h2>
              <p className="text-muted mt-2 text-sm">{t.tagline}</p>
              <span className="text-primary mt-3 inline-block text-sm">
                View full mock
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

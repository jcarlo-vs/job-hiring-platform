import Link from "next/link";

import { THEMES } from "@/lib/themes";

export default function ThemesIndex() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Theme options</h1>
      <p className="text-muted mt-2 text-sm">
        Five directions for the job board. Open each to see a full mock of the
        jobs page, then tell me which one to apply across the app.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {THEMES.map((t) => (
          <Link
            key={t.slug}
            href={`/themes/${t.slug}`}
            className="border-border hover:border-primary block rounded-lg border p-5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-8 w-8 rounded-md"
                style={{ background: t.vars.primary }}
              />
              <span
                className="h-8 w-8 rounded-md border"
                style={{ background: t.vars.bg, borderColor: t.vars.border }}
              />
              <span
                className="h-8 w-8 rounded-md border"
                style={{
                  background: t.vars.surface,
                  borderColor: t.vars.border,
                }}
              />
              <h2 className="ml-2 font-medium">{t.name}</h2>
            </div>
            <p className="text-muted mt-3 text-sm">{t.tagline}</p>
            <span className="text-primary mt-3 inline-block text-sm">
              View full mock
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";

import { ThemeMockup } from "@/components/theme-mockup";
import { THEMES, getTheme } from "@/lib/themes";

export default async function ThemePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = getTheme(slug);

  if (!theme) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">Theme not found</h1>
        <Link href="/themes" className="text-primary mt-4 inline-block text-sm">
          Back to all themes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-6 py-3 text-sm">
        <Link href="/themes" className="text-muted hover:underline">
          All themes
        </Link>
        <span className="text-muted">Preview:</span>
        {THEMES.map((t) => (
          <Link
            key={t.slug}
            href={`/themes/${t.slug}`}
            className={
              t.slug === slug
                ? "text-foreground font-medium"
                : "text-muted hover:underline"
            }
          >
            {t.name}
          </Link>
        ))}
      </div>
      <ThemeMockup theme={theme} />
    </div>
  );
}

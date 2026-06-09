import Link from "next/link";

import { MockAirbnb } from "@/components/mocks/mock-airbnb";
import { MockApple } from "@/components/mocks/mock-apple";
import { MockBubbly } from "@/components/mocks/mock-bubbly";
import { MockGlass } from "@/components/mocks/mock-glass";
import { MockLinear } from "@/components/mocks/mock-linear";
import { MockNeobrutalism } from "@/components/mocks/mock-neobrutalism";
import { MockNotion } from "@/components/mocks/mock-notion";
import { MockSpotify } from "@/components/mocks/mock-spotify";
import { MockStripe } from "@/components/mocks/mock-stripe";
import { MockVercel } from "@/components/mocks/mock-vercel";
import { THEMES } from "@/lib/themes";

const MOCKS: Record<string, React.ComponentType> = {
  neobrutalism: MockNeobrutalism,
  apple: MockApple,
  linear: MockLinear,
  stripe: MockStripe,
  vercel: MockVercel,
  notion: MockNotion,
  airbnb: MockAirbnb,
  spotify: MockSpotify,
  glass: MockGlass,
  bubbly: MockBubbly,
};

export default async function ThemePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const Mock = MOCKS[slug];

  if (!Mock) {
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
      <Mock />
    </div>
  );
}

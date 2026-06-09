export type ThemeMeta = {
  slug: string;
  name: string;
  tagline: string;
  swatch: string;
  bg: string;
};

// Each theme is a hand-built, structurally distinct mock (see components/mocks).
export const THEMES: ThemeMeta[] = [
  {
    slug: "neobrutalism",
    name: "Neobrutalism",
    tagline:
      "Chunky black borders, hard offset shadows, vivid sticker-like cards. Loud and playful.",
    swatch: "#ffd400",
    bg: "#f4f4ef",
  },
  {
    slug: "apple",
    name: "Apple Minimal",
    tagline:
      "A centered hero, huge type, and an airy borderless list. Calm and premium.",
    swatch: "#0071e3",
    bg: "#ffffff",
  },
  {
    slug: "linear",
    name: "Linear Workspace",
    tagline:
      "A dark app shell: left sidebar, command-bar search, dense table rows. Power-user feel.",
    swatch: "#5e6ad2",
    bg: "#0b0c10",
  },
  {
    slug: "stripe",
    name: "Stripe Gradient",
    tagline:
      "An angled gradient hero with an overlapping search bar and elevated cards. Marketing-ready.",
    swatch: "#635bff",
    bg: "#ffffff",
  },
  {
    slug: "vercel",
    name: "Vercel Grid",
    tagline:
      "Stark black-on-white over a dotted grid, mono labels, shared cell borders. Engineered minimalism.",
    swatch: "#000000",
    bg: "#ffffff",
  },
  {
    slug: "notion",
    name: "Notion Docs",
    tagline:
      "A soft, document-like database view with an emoji sidebar. Calm and organized.",
    swatch: "#2383e2",
    bg: "#ffffff",
  },
  {
    slug: "airbnb",
    name: "Marketplace",
    tagline:
      "Warm coral accent, a rounded search pill, and image-topped cards. Consumer-friendly.",
    swatch: "#ff385c",
    bg: "#ffffff",
  },
  {
    slug: "spotify",
    name: "Vibrant Dark",
    tagline:
      "Black canvas, neon green, album-art cards. Bold and energetic.",
    swatch: "#1db954",
    bg: "#121212",
  },
  {
    slug: "glass",
    name: "Glassmorphism",
    tagline:
      "Frosted translucent cards floating over a vivid gradient. Trendy and dreamy.",
    swatch: "#c850c0",
    bg: "linear-gradient(135deg,#6d5efc,#c850c0,#ffcc70)",
  },
  {
    slug: "bubbly",
    name: "Playful Pop",
    tagline:
      "Big rounded cards, pastel multi-color accents, chunky buttons. Friendly and fun.",
    swatch: "#9b5de5",
    bg: "#fffaf3",
  },
];

export function getTheme(slug: string): ThemeMeta | undefined {
  return THEMES.find((t) => t.slug === slug);
}

export type SampleJob = {
  title: string;
  location: string;
  type: string;
  mode: string;
  salary: string | null;
  snippet: string;
};

export const SAMPLE_JOBS: SampleJob[] = [
  {
    title: "Senior Frontend Engineer",
    location: "Remote",
    type: "Full-time",
    mode: "Remote",
    salary: "$90,000 - $140,000",
    snippet: "Build delightful hiring experiences with React and Next.js.",
  },
  {
    title: "Backend Engineer",
    location: "Manila",
    type: "Full-time",
    mode: "Hybrid",
    salary: "$60,000 - $100,000",
    snippet: "Design APIs and data models for our applicant tracking system.",
  },
  {
    title: "Product Designer",
    location: "Remote",
    type: "Full-time",
    mode: "Remote",
    salary: "$70,000 - $110,000",
    snippet: "Own end-to-end design of the candidate and employer flows.",
  },
  {
    title: "Data Analyst",
    location: "Cebu",
    type: "Contract",
    mode: "On-site",
    salary: null,
    snippet: "Analyze hiring funnels and screening quality.",
  },
  {
    title: "Customer Success",
    location: "Remote",
    type: "Part-time",
    mode: "Remote",
    salary: "$25,000 - $40,000",
    snippet: "Help employers get the most out of the platform.",
  },
  {
    title: "Engineering Manager",
    location: "Singapore",
    type: "Full-time",
    mode: "Hybrid",
    salary: "$130,000 - $180,000",
    snippet: "Lead a small, senior team building the screening pipeline.",
  },
];

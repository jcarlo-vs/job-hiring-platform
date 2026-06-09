const SANS =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, Cambria, 'Times New Roman', serif";

export type Theme = {
  slug: string;
  name: string;
  tagline: string;
  vars: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
    primaryText: string;
    accentSoft: string;
  };
  headingFont: string;
  bodyFont: string;
  radius: number;
  borderWidth: number;
  shadow: string;
};

export const THEMES: Theme[] = [
  {
    slug: "indigo",
    name: "Indigo Professional",
    tagline:
      "Clean, modern SaaS look. The safe, trustworthy default for B2B hiring.",
    vars: {
      bg: "#ffffff",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      border: "#e2e8f0",
      primary: "#4f46e5",
      primaryText: "#ffffff",
      accentSoft: "#eef2ff",
    },
    headingFont: SANS,
    bodyFont: SANS,
    radius: 10,
    borderWidth: 1,
    shadow: "0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.08)",
  },
  {
    slug: "neobrutalism",
    name: "Neobrutalism",
    tagline:
      "Thick black borders, hard offset shadows, vivid flats. Bold and memorable.",
    vars: {
      bg: "#f4f4ef",
      surface: "#ffffff",
      text: "#111111",
      muted: "#555555",
      border: "#111111",
      primary: "#ffd400",
      primaryText: "#111111",
      accentSoft: "#d6ecff",
    },
    headingFont: SANS,
    bodyFont: SANS,
    radius: 4,
    borderWidth: 2,
    shadow: "5px 5px 0 #111111",
  },
  {
    slug: "midnight",
    name: "Midnight Bold",
    tagline: "Dark, high-contrast, neon accent. A tech-forward, startup feel.",
    vars: {
      bg: "#0b1020",
      surface: "#131a2e",
      text: "#e6edf6",
      muted: "#93a4c0",
      border: "#233152",
      primary: "#22d3ee",
      primaryText: "#07121f",
      accentSoft: "#16233f",
    },
    headingFont: SANS,
    bodyFont: SANS,
    radius: 12,
    borderWidth: 1,
    shadow: "0 0 0 1px rgba(34,211,238,0.05), 0 10px 28px rgba(0,0,0,0.4)",
  },
  {
    slug: "editorial",
    name: "Warm Editorial",
    tagline:
      "Warm neutrals with serif headings. Premium, magazine-like and human.",
    vars: {
      bg: "#f7f3ec",
      surface: "#fffdf8",
      text: "#2a2521",
      muted: "#7a7068",
      border: "#e7ddcd",
      primary: "#c2613f",
      primaryText: "#ffffff",
      accentSoft: "#f1e7da",
    },
    headingFont: SERIF,
    bodyFont: SANS,
    radius: 8,
    borderWidth: 1,
    shadow: "0 1px 2px rgba(42,37,33,0.05), 0 8px 20px rgba(42,37,33,0.06)",
  },
  {
    slug: "soft-pastel",
    name: "Soft Pastel",
    tagline:
      "Rounded, airy, gentle violet accent. Friendly and approachable for job seekers.",
    vars: {
      bg: "#faf9ff",
      surface: "#ffffff",
      text: "#2b2740",
      muted: "#7a7596",
      border: "#ece9f7",
      primary: "#7c6cf0",
      primaryText: "#ffffff",
      accentSoft: "#efeafe",
    },
    headingFont: SANS,
    bodyFont: SANS,
    radius: 20,
    borderWidth: 1,
    shadow: "0 6px 22px rgba(124,108,240,0.12)",
  },
];

export function getTheme(slug: string): Theme | undefined {
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
    title: "Backend Engineer (Node/Postgres)",
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

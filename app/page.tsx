import Link from "next/link";

import { getProfile } from "@/lib/auth";

const audiences = [
  {
    tag: "For employers",
    title: "Post your jobs. Get talented applicants.",
    body: "Hiring season is here. Drop in your must-haves and every applicant is scored against them in seconds, with the reasoning shown - so you stop skimming a pile and start interviewing the right people.",
  },
  {
    tag: "For job seekers",
    title: "Wanna get hired?",
    body: "No more applying into the void or getting ghosted. Apply once, get screened against the role's real requirements instantly, and actually see where you stand - so you finally know if you're a fit.",
  },
];

const features = [
  {
    title: "Scored in seconds",
    body: "The moment someone applies, AI scores their resume against the criteria you wrote - no waiting, no manual sifting through a pile.",
  },
  {
    title: "Every score is explained",
    body: "See the matched requirements, the gaps, and any flags behind each score. Nothing is a black box, and it is all saved and auditable.",
  },
  {
    title: "You always decide",
    body: "The AI ranks and explains - it never auto-rejects anyone. You move candidates through the pipeline and make every call.",
  },
];

const steps = [
  {
    n: "1",
    title: "Write your criteria",
    body: "Post the role and its must-have requirements in a couple of minutes.",
  },
  {
    n: "2",
    title: "Applicants apply",
    body: "Candidates upload a resume and apply in one click - screening fires instantly in the background.",
  },
  {
    n: "3",
    title: "Review and decide",
    body: "See everyone ranked by an explainable match score, then move them through your pipeline.",
  },
];

const chips = [
  "Scored in seconds",
  "Reasoning you can audit",
  "A human always decides",
];

export default async function Home() {
  const profile = await getProfile();

  const ctas = !profile
    ? {
        primary: { href: "/signup", label: "Register Now" },
        secondary: { href: "/jobs", label: "Find jobs" },
      }
    : profile.role === "EMPLOYER"
      ? {
          primary: { href: "/jobs/new", label: "Post a job" },
          secondary: { href: "/dashboard", label: "Your dashboard" },
        }
      : {
          primary: { href: "/jobs", label: "Find jobs" },
          secondary: { href: "/applications", label: "My applications" },
        };

  return (
    <div className="relative isolate overflow-hidden">
      {/* Decorative gradient bubbles - span the full body width, behind everything */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -left-16 top-24 h-80 w-80 rounded-full bg-linear-to-br from-[#9b5de5] to-[#f15bb5] opacity-25 blur-3xl" />
        <div className="absolute -right-10 top-0 h-80 w-80 rounded-full bg-linear-to-br from-[#00bbf9] to-[#9b5de5] opacity-20 blur-3xl" />
        <div className="absolute left-[32%] top-[44%] h-72 w-72 rounded-full bg-linear-to-tr from-[#fee440] to-[#f15bb5] opacity-20 blur-3xl" />
        <div className="absolute -right-16 bottom-40 h-80 w-80 rounded-full bg-linear-to-br from-[#f15bb5] to-[#9b5de5] opacity-20 blur-3xl" />
        <div className="absolute -left-12 bottom-0 h-72 w-72 rounded-full bg-linear-to-tr from-[#00bbf9] to-[#9b5de5] opacity-20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="py-20 sm:py-28">
          <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold">
            <span className="bg-primary h-2 w-2 animate-pulse rounded-full" />
            Hiring season is here
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Screen resumes in seconds. You make the final call.
          </h1>
          <p className="text-muted mt-5 max-w-2xl text-lg">
            Write your criteria once, and every applicant is scored against it
            the instant they apply - with the reasoning shown. You spend your
            time on the right people, and candidates finally know where they
            stand.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ctas.primary.href} className="btn-primary">
              {ctas.primary.label}
            </Link>
            <Link
              href={ctas.secondary.href}
              className="border-border rounded-full border-2 bg-white/70 px-5 py-2.5 text-sm font-bold backdrop-blur transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {ctas.secondary.label}
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="border-border text-muted rounded-full border bg-white px-3 py-1 text-xs font-semibold"
              >
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Two-sided hook */}
        <section className="grid gap-5 sm:grid-cols-2">
          {audiences.map((a) => (
            <div
              key={a.tag}
              className="border-border rounded-2xl border-2 bg-white p-7"
            >
              <p className="text-primary text-xs font-bold tracking-wide uppercase">
                {a.tag}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                {a.title}
              </h2>
              <p className="text-muted mt-3 leading-relaxed">{a.body}</p>
            </div>
          ))}
        </section>

        {/* Why it is different */}
        <section className="mt-5 grid gap-5 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border-border rounded-2xl border-2 bg-white p-6"
            >
              <h2 className="font-bold">{feature.title}</h2>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                {feature.body}
              </p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="py-16">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.n}
                className="border-border rounded-2xl border-2 bg-white p-6"
              >
                <span className="bg-primary text-primary-foreground inline-flex h-8 w-8 items-center justify-center rounded-full font-bold">
                  {step.n}
                </span>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="text-muted mt-1 text-sm leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        {!profile && (
          <section className="mb-16 rounded-3xl bg-linear-to-br from-[#9b5de5] to-[#f15bb5] p-10 text-center text-white sm:p-14">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Stop guessing. Start matching.
            </h2>
            <p className="mx-auto mt-3 max-w-lg opacity-90">
              Hiring season is here. Post a role and watch the right applicants
              rise to the top in seconds - or apply to one and finally see where
              you stand.
            </p>
            <Link
              href="/signup"
              className="text-foreground mt-7 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5"
            >
              Get started free
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

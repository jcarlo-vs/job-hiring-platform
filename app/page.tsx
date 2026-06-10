import Link from "next/link";

import { getProfile } from "@/lib/auth";

const features = [
  {
    title: "Explainable screening",
    body: "Every applicant gets an AI match score with the reasoning behind it - matched and missing requirements, and any flags - all persisted and auditable.",
  },
  {
    title: "Human-in-the-loop",
    body: "The AI scores and explains; it never auto-rejects. Hiring managers move candidates through the pipeline and always make the final call.",
  },
  {
    title: "A real pipeline",
    body: "Track candidates from Applied through Screened, interviews, and offers on a drag-and-drop board - with screening running safely in the background.",
  },
];

const steps = [
  {
    n: "1",
    title: "Post a role",
    body: "Employers write the job and its requirements in a couple of minutes.",
  },
  {
    n: "2",
    title: "Applicants apply",
    body: "Candidates upload a resume and apply in one click. Screening runs in the background.",
  },
  {
    n: "3",
    title: "Review and decide",
    body: "See candidates ranked by an explainable match score, then move them through your pipeline.",
  },
];

export default async function Home() {
  const profile = await getProfile();

  const ctas = !profile
    ? {
        primary: { href: "/signup", label: "Get started" },
        secondary: { href: "/jobs", label: "Browse jobs" },
      }
    : profile.role === "EMPLOYER"
      ? {
          primary: { href: "/jobs/new", label: "Post a job" },
          secondary: { href: "/dashboard", label: "Your dashboard" },
        }
      : {
          primary: { href: "/jobs", label: "Browse jobs" },
          secondary: { href: "/applications", label: "My applications" },
        };

  return (
    <div className="mx-auto max-w-5xl px-6">
      <section className="py-20 sm:py-28">
        <p className="text-primary text-sm font-bold">
          AI-assisted resume screening
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          Screen candidates faster - without letting the AI decide.
        </h1>
        <p className="text-muted mt-5 max-w-2xl text-lg">
          Employers post roles and review applicants ranked by an explainable AI
          match score. Every recommendation comes with its reasoning, and a
          human always makes the final call.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={ctas.primary.href} className="btn-primary">
            {ctas.primary.label}
          </Link>
          <Link
            href={ctas.secondary.href}
            className="border-border rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {ctas.secondary.label}
          </Link>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
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

      {!profile && (
        <section className="border-border mb-16 rounded-2xl border-2 bg-white p-8 text-center">
          <h2 className="text-xl font-bold">Ready to try it?</h2>
          <p className="text-muted mx-auto mt-2 max-w-md text-sm">
            Sign up as an employer to post a role, or as a job seeker to apply
            and watch the screening work in real time.
          </p>
          <Link href="/signup" className="btn-primary mt-5 inline-block">
            Get started
          </Link>
        </section>
      )}
    </div>
  );
}

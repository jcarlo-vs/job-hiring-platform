const features = [
  {
    title: "Explainable screening",
    body: "Every applicant gets an AI match score with the reasoning behind it — matched and missing requirements, and any flags — all persisted and auditable.",
  },
  {
    title: "Human-in-the-loop",
    body: "The AI scores and explains; it never auto-rejects. Hiring managers move candidates through the pipeline and always make the final call.",
  },
  {
    title: "A real pipeline",
    body: "Track candidates from Applied through Screened, interviews, and offers on a drag-and-drop board — with screening running safely in the background.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <section className="py-20 sm:py-28">
        <p className="text-primary text-sm font-medium">
          AI-assisted resume screening
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Screen candidates faster — without letting the AI decide.
        </h1>
        <p className="text-muted mt-5 max-w-2xl text-lg">
          Employers post roles and review applicants ranked by an explainable AI
          match score. Every recommendation comes with its reasoning, and a
          human always makes the final call.
        </p>
        <div className="mt-8">
          <span className="bg-primary text-primary-foreground inline-block rounded-md px-4 py-2 text-sm font-medium">
            Coming soon
          </span>
        </div>
      </section>

      <section className="border-border grid gap-8 border-t py-16 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title}>
            <h2 className="font-medium">{feature.title}</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">
              {feature.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

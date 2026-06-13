import type { Metadata } from "next";
import Link from "next/link";

import { UserMenu } from "@/components/user-menu";
import { getProfile } from "@/lib/auth";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "TalentScreen - AI-powered screening. Human-powered decisions.",
  description:
    "Write your criteria once and every applicant is scored against it the instant they apply, with the reasoning shown. You make the final call.",
};

const logos = [
  "Northwind",
  "Lumen Labs",
  "Atlas",
  "Vertex",
  "Cobalt",
  "Meridian",
  "Brightwave",
  "Foundry",
];

const candidates = [
  { initials: "DR", name: "Daniel Reyes", role: "Product Designer", score: 88 },
  { initials: "PN", name: "Priya Nair", role: "Backend Engineer", score: 81 },
  { initials: "ML", name: "Marcus Lee", role: "Data Analyst", score: 73 },
];

const stats = [
  { value: "Seconds", label: "to score a resume" },
  { value: "100%", label: "explainable scores" },
  { value: "0", label: "auto-rejections, ever" },
  { value: "12 hrs", label: "saved per role" },
];

const features = [
  {
    title: "Scored in seconds",
    body: "The moment someone applies, AI scores their resume against the criteria you wrote. No waiting, no manual sifting.",
  },
  {
    title: "Every score is explained",
    body: "See the matched requirements, the gaps, and any flags behind each score. Nothing is a black box, and it is all saved and auditable.",
  },
  {
    title: "You always decide",
    body: "The AI ranks and explains. It never auto-rejects anyone. You move candidates through the pipeline and make every call.",
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
    body: "Candidates upload a resume and apply in one click; screening fires instantly in the background.",
  },
  {
    n: "3",
    title: "Review and decide",
    body: "See everyone ranked by an explainable match score, then move them through your pipeline.",
  },
];

const testimonials = [
  {
    quote:
      "We stopped drowning in resumes. The shortlist is ready before I have finished my coffee, and I can see exactly why.",
    name: "Priya Shah",
    role: "Head of Talent, Lumen Labs",
    img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80&auto=format&fit=crop",
    initials: "PS",
  },
  {
    quote:
      "I finally know where I stand instead of being ghosted. I saw my match score before I even applied.",
    name: "Daniel Reyes",
    role: "Product Designer",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80&auto=format&fit=crop",
    initials: "DR",
  },
  {
    quote:
      "It ranks and explains, but I make every call. That is the part I trust.",
    name: "Marcus Webb",
    role: "Engineering Director, Atlas",
    img: "",
    initials: "MW",
  },
];

export default async function Home() {
  const profile = await getProfile();

  const ctas = !profile
    ? {
        primary: { href: "/signup", label: "Get started" },
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
    <div className={styles.page}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link
            href="/"
            className={styles.wordmark}
            aria-label="TalentScreen home"
          >
            <span className={styles.mark} aria-hidden="true">
              <span className={styles.markDot} />
            </span>
            TalentScreen
          </Link>

          <nav className={styles.navLinks} aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#features">Product</a>
            <a href="#proof">Customers</a>
            <Link href="/jobs">Find jobs</Link>
          </nav>

          <div className={styles.navCta}>
            {profile ? (
              <>
                <Link href={ctas.primary.href} className={styles.primaryBtn}>
                  {ctas.primary.label}
                </Link>
                <UserMenu
                  name={profile.full_name}
                  role={profile.role}
                  company={profile.company_name}
                />
              </>
            ) : (
              <>
                <Link href="/login" className={styles.ghostBtn}>
                  Sign in
                </Link>
                <Link href="/signup" className={styles.primaryBtn}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={`${styles.heroCopy} ${styles.reveal}`}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                New: explainable AI screening
              </span>
              <h1 className={styles.h1}>
                Screen resumes in seconds.{" "}
                <span className={styles.h1Accent}>You make the final call.</span>
              </h1>
              <p className={styles.lede}>
                Write your criteria once, and every applicant is scored against
                it the instant they apply, with the reasoning shown. You spend
                your time on the right people, and candidates finally know where
                they stand.
              </p>

              <div className={styles.heroBtns}>
                <Link href={ctas.primary.href} className={styles.primaryBtnLg}>
                  {ctas.primary.label}
                </Link>
                <Link href={ctas.secondary.href} className={styles.ghostBtnLg}>
                  {ctas.secondary.label}
                </Link>
              </div>

              <ul
                className={styles.chips}
                aria-label="Why teams trust TalentScreen"
              >
                <li>
                  <CheckIcon /> Scored in seconds
                </li>
                <li>
                  <CheckIcon /> Reasoning you can audit
                </li>
                <li>
                  <CheckIcon /> A human always decides
                </li>
              </ul>
            </div>

            <div
              className={`${styles.heroMedia} ${styles.reveal} ${styles.revealD1}`}
            >
              <div className={styles.photoFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.photo}
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop"
                  alt="A hiring team reviewing candidates together at a table"
                  loading="eager"
                  width={1200}
                  height={800}
                />
                <div className={styles.photoTone} aria-hidden="true" />
              </div>

              {/* Overlapping AI score card */}
              <div
                className={styles.scoreCard}
                role="img"
                aria-label="Match score 94 percent for Amara Okonkwo, Senior Frontend Engineer"
              >
                <div className={styles.scoreHead}>
                  <span className={styles.scoreAvatar} aria-hidden="true">
                    AO
                  </span>
                  <div className={styles.scoreWho}>
                    <strong>Amara Okonkwo</strong>
                    <span>Senior Frontend Engineer</span>
                  </div>
                  <span className={styles.scoreBadge}>94%</span>
                </div>
                <div className={styles.scoreReqs}>
                  <span className={styles.req}>
                    <CheckIcon /> 5+ yrs React
                  </span>
                  <span className={`${styles.req} ${styles.reqGap}`}>
                    <FlagIcon /> Led a team of 3+
                  </span>
                </div>
                <p className={styles.scoreNote}>
                  <span className={styles.humanDot} aria-hidden="true" />A human
                  always decides.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* LOGO CLOUD */}
        <section
          className={styles.logos}
          aria-label="Companies that hire with TalentScreen"
        >
          <p className={styles.logosLabel}>Trusted by hiring teams at</p>
          <div className={styles.logosRow}>
            {logos.map((l) => (
              <span key={l} className={styles.logo}>
                {l}
              </span>
            ))}
          </div>
        </section>

        {/* STATS BAND */}
        <section className={styles.statsBand} aria-label="Proof in numbers">
          <div className={styles.statsInner}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="proof" className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>
              Loved by both sides of the table
            </span>
            <h2 className={styles.h2}>
              Recruiters and candidates agree on one thing
            </h2>
            <p className={styles.sub}>
              Real fit, shown in seconds, with a person in the loop on every
              decision.
            </p>
          </div>

          <div className={styles.quotes}>
            {testimonials.map((t) => (
              <figure key={t.name} className={styles.quote}>
                <blockquote>
                  <QuoteIcon />
                  <p>{t.quote}</p>
                </blockquote>
                <figcaption className={styles.quoteWho}>
                  {t.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.quoteAvatar}
                      src={t.img}
                      alt={`Portrait of ${t.name}`}
                      loading="lazy"
                      width={96}
                      height={96}
                    />
                  ) : (
                    <span className={styles.quoteInitials} aria-hidden="true">
                      {t.initials}
                    </span>
                  )}
                  <span className={styles.quoteName}>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* TWO AUDIENCES */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>One platform, two wins</span>
            <h2 className={styles.h2}>
              Built for the people doing the hiring, and the people getting
              hired
            </h2>
          </div>

          <div className={styles.audiences}>
            <article className={styles.audience}>
              <div className={styles.audiencePhoto}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1000&q=80&auto=format&fit=crop"
                  alt="Two colleagues talking through a hiring decision"
                  loading="lazy"
                  width={1000}
                  height={667}
                />
              </div>
              <div className={styles.audienceBody}>
                <span className={styles.audienceTag}>For employers</span>
                <h3>Post your jobs. Get talented applicants.</h3>
                <p>
                  Drop in your must-haves and every applicant is scored against
                  them in seconds, with the reasoning shown, so you stop skimming
                  a pile and start interviewing the right people.
                </p>
                <Link href="/signup" className={styles.textLink}>
                  Get started <Arrow />
                </Link>
              </div>
            </article>

            <article className={styles.audience}>
              <div className={styles.audienceBody}>
                <span
                  className={`${styles.audienceTag} ${styles.audienceTagAlt}`}
                >
                  For job seekers
                </span>
                <h3>Know where you stand.</h3>
                <p>
                  No more applying into the void or getting ghosted. Apply once,
                  get screened against the role&apos;s real requirements
                  instantly, and actually see where you stand.
                </p>
                <Link href="/jobs" className={styles.textLink}>
                  Find jobs <Arrow />
                </Link>
              </div>
              <div className={styles.audiencePanel} aria-hidden="true">
                <div className={styles.jobCard}>
                  <div className={styles.jobTop}>
                    <span className={styles.jobLogo}>L</span>
                    <div className={styles.jobMeta}>
                      <strong>Senior Frontend Engineer</strong>
                      <span>Lumen Labs - Remote</span>
                    </div>
                    <span className={styles.jobScore}>92%</span>
                  </div>
                  <div className={styles.jobBar}>
                    <span
                      className={styles.jobBarFill}
                      style={{ width: "92%" }}
                    />
                  </div>
                  <div className={styles.jobTags}>
                    <span>$140k-$180k</span>
                    <span>React</span>
                    <span>TypeScript</span>
                  </div>
                </div>
                <div className={`${styles.jobCard} ${styles.jobCardMuted}`}>
                  <div className={styles.jobTop}>
                    <span className={styles.jobLogo}>A</span>
                    <div className={styles.jobMeta}>
                      <strong>Product Designer</strong>
                      <span>Atlas - San Francisco</span>
                    </div>
                    <span className={styles.jobScore}>87%</span>
                  </div>
                  <div className={styles.jobBar}>
                    <span
                      className={styles.jobBarFill}
                      style={{ width: "87%" }}
                    />
                  </div>
                  <div className={styles.jobTags}>
                    <span>$120k-$150k</span>
                    <span>Figma</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* PRODUCT / RANKING MOCK + FEATURES */}
        <section id="features" className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>Inside the product</span>
            <h2 className={styles.h2}>A ranked shortlist you can actually trust</h2>
            <p className={styles.sub}>
              Every applicant scored against the criteria you wrote, with the
              reasoning open for anyone to audit.
            </p>
          </div>

          <div className={styles.productWrap}>
            <div className={styles.appPanel}>
              <div className={styles.appChrome}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.appTitle}>
                  Senior Frontend Engineer - 4 applicants
                </span>
              </div>

              <div className={styles.appBody}>
                {/* Expanded top candidate */}
                <div className={`${styles.candidate} ${styles.candidateTop}`}>
                  <div className={styles.candRow}>
                    <span className={styles.candAvatar}>AO</span>
                    <div className={styles.candWho}>
                      <strong>Amara Okonkwo</strong>
                      <span>Senior Frontend Engineer</span>
                    </div>
                    <span className={styles.candScore}>94%</span>
                  </div>
                  <div className={styles.reqGrid}>
                    <span className={styles.matchChip}>
                      <CheckIcon /> 5+ yrs React
                    </span>
                    <span className={styles.matchChip}>
                      <CheckIcon /> TypeScript, strict mode
                    </span>
                    <span className={styles.matchChip}>
                      <CheckIcon /> Shipped design systems
                    </span>
                    <span className={`${styles.matchChip} ${styles.gapChip}`}>
                      <FlagIcon /> Led a team of 3+
                    </span>
                  </div>
                  <p className={styles.reasonLine}>
                    <span className={styles.reasonLabel}>Reasoning</span>
                    Strong front-end depth; leadership scope is the only gap.
                  </p>
                </div>

                {/* Collapsed rows */}
                <ul className={styles.candList}>
                  {candidates.map((c) => (
                    <li key={c.name} className={styles.candidate}>
                      <div className={styles.candRow}>
                        <span
                          className={styles.candAvatar}
                          data-variant={c.initials}
                        >
                          {c.initials}
                        </span>
                        <div className={styles.candWho}>
                          <strong>{c.name}</strong>
                          <span>{c.role}</span>
                        </div>
                        <div className={styles.candBarWrap}>
                          <span className={styles.candBar}>
                            <span
                              className={styles.candBarFill}
                              style={{ width: `${c.score}%` }}
                            />
                          </span>
                          <span className={styles.candPct}>{c.score}%</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles.featureList}>
              {features.map((f) => (
                <div key={f.title} className={styles.feature}>
                  <span className={styles.featureIcon} aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>How it works</span>
            <h2 className={styles.h2}>From a blank role to a ranked shortlist</h2>
          </div>

          <ol className={styles.steps}>
            {steps.map((s) => (
              <li key={s.n} className={styles.step}>
                <span className={styles.stepNum}>{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FINAL CTA */}
        <section className={styles.ctaBand}>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>Stop guessing. Start matching.</h2>
            <p className={styles.ctaBody}>
              Post a role and watch the right applicants rise to the top in
              seconds, or apply to one and finally see where you stand.
            </p>
            <div className={styles.ctaBtns}>
              <Link href={ctas.primary.href} className={styles.ctaPrimary}>
                {ctas.primary.label}
              </Link>
              <Link href={ctas.secondary.href} className={styles.ctaGhost}>
                {ctas.secondary.label}
              </Link>
            </div>
            <p className={styles.ctaNote}>
              <span className={styles.humanDot} aria-hidden="true" />
              The AI ranks and explains. It never auto-rejects. You always
              decide.
            </p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Link
              href="/"
              className={styles.wordmark}
              aria-label="TalentScreen home"
            >
              <span className={styles.mark} aria-hidden="true">
                <span className={styles.markDot} />
              </span>
              TalentScreen
            </Link>
            <p className={styles.footerTag}>
              AI-powered screening. Human-powered decisions.
            </p>
          </div>

          <nav className={styles.footerCols} aria-label="Footer">
            <div className={styles.footerCol}>
              <h4>Product</h4>
              <Link href="/jobs">Find jobs</Link>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#proof">Customers</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Company</h4>
              <a href="#proof">About</a>
              <a href="#proof">Careers</a>
              <a href="#proof">Press</a>
              <Link href="/signup">Get started</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>Resources</h4>
              <a href="#features">Documentation</a>
              <a href="#proof">Customer stories</a>
              <a href="#how">Security</a>
              <a href="#proof">Contact</a>
            </div>
          </nav>
        </div>

        <div className={styles.footerBottom}>
          <span>2026 TalentScreen, Inc. All rights reserved.</span>
          <Link href="/jobs" className={styles.themesLink}>
            Browse jobs
          </Link>
        </div>
      </footer>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className={styles.iCheck}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M13.5 4.5 6.5 11.5 2.5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg
      className={styles.iFlag}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 1.5v13M3 3.5h7l-1.4 2.2L10 8H3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg
      className={styles.iQuote}
      viewBox="0 0 32 24"
      width="32"
      height="24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M13 24V12C13 5.4 8.4 1 2 0v4c3 .8 4.5 2.8 4.5 6H2v14h11Zm17 0V12c0-6.6-4.6-11-11-12v4c3 .8 4.5 2.8 4.5 6H19v14h11Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Arrow() {
  return (
    <svg
      className={styles.iArrow}
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 8h9M8.5 4 12.5 8l-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

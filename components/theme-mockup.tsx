import { SAMPLE_JOBS, type Theme } from "@/lib/themes";

// A self-contained, static "/jobs" mock rendered in a given theme. Inline
// styles keep each theme fully isolated from the app's global tokens.
export function ThemeMockup({ theme }: { theme: Theme }) {
  const v = theme.vars;
  const brutal = theme.borderWidth > 1;

  const pill: React.CSSProperties = {
    background: v.accentSoft,
    color: brutal ? v.text : v.muted,
    border: brutal ? `1px solid ${v.border}` : "none",
    borderRadius: brutal ? 4 : 999,
    padding: "2px 10px",
    fontSize: 12,
  };
  const primaryBtn: React.CSSProperties = {
    background: v.primary,
    color: v.primaryText,
    border: brutal ? `${theme.borderWidth}px solid ${v.border}` : "none",
    borderRadius: theme.radius,
    boxShadow: brutal ? `3px 3px 0 ${v.border}` : "none",
    padding: "8px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  };
  const input: React.CSSProperties = {
    background: v.bg,
    color: v.muted,
    border: `${theme.borderWidth}px solid ${v.border}`,
    borderRadius: theme.radius,
    padding: "8px 12px",
    fontSize: 14,
  };
  const card: React.CSSProperties = {
    background: v.surface,
    border: `${theme.borderWidth}px solid ${v.border}`,
    borderRadius: theme.radius,
    boxShadow: theme.shadow,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  return (
    <div
      style={{
        background: v.bg,
        color: v.text,
        fontFamily: theme.bodyFont,
        minHeight: 640,
      }}
    >
      <header
        style={{
          borderBottom: `${theme.borderWidth}px solid ${v.border}`,
          background: v.surface,
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 700, fontFamily: theme.headingFont }}>
            Talent<span style={{ color: v.primary }}>Screen</span>
          </span>
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 14,
              color: v.muted,
            }}
          >
            <span>Jobs</span>
            <span>Sign in</span>
            <button type="button" style={primaryBtn}>
              Sign up
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <h1
          style={{
            fontFamily: theme.headingFont,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Browse jobs
        </h1>
        <p style={{ color: v.muted, marginTop: 6, fontSize: 14 }}>
          {SAMPLE_JOBS.length} open roles
        </p>

        <div
          style={{
            ...card,
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            marginTop: 24,
            padding: 16,
          }}
        >
          <span style={{ ...input, flex: "1 1 240px" }}>
            Search title or description
          </span>
          <span style={input}>Any type</span>
          <span style={input}>Any mode</span>
          <button type="button" style={primaryBtn}>
            Search
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          {SAMPLE_JOBS.map((job) => (
            <div key={job.title} style={card}>
              <h3
                style={{
                  fontFamily: theme.headingFont,
                  fontSize: 17,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {job.title}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={pill}>{job.location}</span>
                <span style={pill}>{job.type}</span>
                <span style={pill}>{job.mode}</span>
              </div>
              {job.salary && (
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {job.salary}
                </div>
              )}
              <p style={{ color: v.muted, fontSize: 14, margin: 0, flex: 1 }}>
                {job.snippet}
              </p>
              <div>
                <button type="button" style={primaryBtn}>
                  View role
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

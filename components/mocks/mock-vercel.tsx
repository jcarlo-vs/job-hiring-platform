import { SAMPLE_JOBS } from "@/lib/themes";

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

export function MockVercel() {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#000000",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        minHeight: 640,
        backgroundImage: "radial-gradient(#e3e3e3 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <header
        style={{ borderBottom: "1px solid #000000", background: "#ffffff" }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            ▲ TalentScreen
          </span>
          <nav
            style={{
              display: "flex",
              gap: 18,
              fontSize: 14,
              alignItems: "center",
            }}
          >
            <span>Jobs</span>
            <span>Sign in</span>
            <span
              style={{
                background: "#000000",
                color: "#ffffff",
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Sign up
            </span>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            color: "#666666",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          / jobs
        </div>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            margin: "6px 0 0",
          }}
        >
          Open positions
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 1,
            marginTop: 28,
            border: "1px solid #000000",
            background: "#000000",
          }}
        >
          {SAMPLE_JOBS.map((j) => (
            <div key={j.title} style={{ background: "#ffffff", padding: 20 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "#666666",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {j.type} / {j.mode}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  margin: "8px 0 0",
                }}
              >
                {j.title}
              </h3>
              <p style={{ color: "#444444", fontSize: 14, marginTop: 8 }}>
                {j.snippet}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  fontFamily: MONO,
                  fontSize: 12,
                }}
              >
                <span>{j.salary ?? "n/a"}</span>
                <span
                  style={{
                    background: "#000000",
                    color: "#ffffff",
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  VIEW
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

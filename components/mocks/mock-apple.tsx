import { SAMPLE_JOBS } from "@/lib/themes";

export function MockApple() {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#1d1d1f",
        fontFamily:
          "-apple-system, 'SF Pro Display', ui-sans-serif, system-ui, sans-serif",
        minHeight: 640,
      }}
    >
      <header style={{ borderBottom: "1px solid #f0f0f2" }}>
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 14,
          }}
        >
          <span style={{ fontWeight: 600 }}>TalentScreen</span>
          <nav style={{ display: "flex", gap: 26, color: "#6e6e73" }}>
            <span>Jobs</span>
            <span>Sign in</span>
          </nav>
        </div>
      </header>

      <section style={{ textAlign: "center", padding: "76px 24px 44px" }}>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Find work you love.
        </h1>
        <p
          style={{
            color: "#6e6e73",
            fontSize: 21,
            lineHeight: 1.4,
            marginTop: 16,
            maxWidth: 560,
            marginInline: "auto",
          }}
        >
          Browse roles from teams building the future. Apply in one click with
          your profile resume.
        </p>
        <div style={{ marginTop: 30 }}>
          <span
            style={{
              background: "#0071e3",
              color: "#ffffff",
              borderRadius: 980,
              padding: "12px 26px",
              fontSize: 17,
              fontWeight: 500,
            }}
          >
            Browse all roles
          </span>
        </div>
      </section>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 72px" }}>
        {SAMPLE_JOBS.map((j) => (
          <div
            key={j.title}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "24px 0",
              borderTop: "1px solid #f0f0f2",
            }}
          >
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>
                {j.title}
              </h3>
              <p style={{ color: "#6e6e73", fontSize: 15, marginTop: 4 }}>
                {j.location} · {j.type} · {j.mode}
                {j.salary ? ` · ${j.salary}` : ""}
              </p>
            </div>
            <span
              style={{
                color: "#0071e3",
                fontSize: 15,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              View ›
            </span>
          </div>
        ))}
      </main>
    </div>
  );
}

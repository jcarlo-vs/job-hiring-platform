import { SAMPLE_JOBS } from "@/lib/themes";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 18,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  padding: 20,
};

export function MockGlass() {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg,#6d5efc 0%,#c850c0 50%,#ffcc70 100%)",
        color: "#ffffff",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        minHeight: 640,
      }}
    >
      <header>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>TalentScreen</span>
          <nav style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 14 }}>
            <span style={{ opacity: 0.9 }}>Jobs</span>
            <span style={{ ...glassCard, padding: "8px 16px", borderRadius: 999, fontWeight: 600 }}>Sign up</span>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 24px" }}>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, maxWidth: 560, lineHeight: 1.1 }}>
          Your next role, in focus
        </h1>
        <div style={{ ...glassCard, marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderRadius: 999, padding: 10 }}>
          <span style={{ flex: "1 1 220px", padding: "8px 14px", opacity: 0.9 }}>Search roles</span>
          <span style={{ background: "rgba(255,255,255,0.9)", color: "#6d28d9", borderRadius: 999, padding: "9px 20px", fontWeight: 700 }}>Search</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18, marginTop: 26 }}>
          {SAMPLE_JOBS.map((j) => (
            <div key={j.title} style={glassCard}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{j.title}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {[j.location, j.type, j.mode].map((t) => (
                  <span key={t} style={{ background: "rgba(255,255,255,0.22)", borderRadius: 999, padding: "2px 10px", fontSize: 12 }}>{t}</span>
                ))}
              </div>
              {j.salary && <div style={{ fontWeight: 700, marginTop: 10 }}>{j.salary}</div>}
              <p style={{ fontSize: 14, opacity: 0.92, marginTop: 10 }}>{j.snippet}</p>
              <span style={{ display: "inline-block", marginTop: 6, background: "rgba(255,255,255,0.9)", color: "#6d28d9", borderRadius: 999, padding: "7px 16px", fontWeight: 700, fontSize: 13 }}>Apply</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

import { SAMPLE_JOBS } from "@/lib/themes";

const ART = [
  "linear-gradient(135deg,#1db954,#155f33)",
  "linear-gradient(135deg,#e8115b,#7b1733)",
  "linear-gradient(135deg,#509bf5,#1e3a8a)",
  "linear-gradient(135deg,#f59b23,#7a4a06)",
  "linear-gradient(135deg,#af2896,#4a1140)",
  "linear-gradient(135deg,#1db954,#0b3d91)",
];

export function MockSpotify() {
  return (
    <div
      style={{
        background: "#121212",
        color: "#ffffff",
        fontFamily: "ui-sans-serif, 'Circular', -apple-system, sans-serif",
        minHeight: 640,
      }}
    >
      <header
        style={{
          background: "linear-gradient(#1f1f1f,#121212)",
          position: "sticky",
          top: 0,
        }}
      >
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 20 }}>● TalentScreen</span>
          <nav style={{ display: "flex", gap: 18, alignItems: "center", color: "#b3b3b3", fontSize: 14 }}>
            <span>Jobs</span>
            <span style={{ background: "#1db954", color: "#000", borderRadius: 999, padding: "9px 18px", fontWeight: 700 }}>Sign up</span>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 24px" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Made for you</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 18, marginTop: 20 }}>
          {SAMPLE_JOBS.map((j, i) => (
            <div key={j.title} style={{ background: "#181818", borderRadius: 10, padding: 16 }}>
              <div style={{ height: 120, borderRadius: 8, background: ART[i % ART.length], boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "14px 0 0" }}>{j.title}</h3>
              <p style={{ color: "#b3b3b3", fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{j.location} · {j.type} · {j.mode}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span style={{ color: "#b3b3b3", fontSize: 13 }}>{j.salary ?? "Hidden"}</span>
                <span style={{ background: "#1db954", color: "#000", borderRadius: 999, width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>›</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

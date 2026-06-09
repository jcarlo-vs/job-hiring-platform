import { SAMPLE_JOBS } from "@/lib/themes";

const POPS = [
  { bg: "#fff0f0", accent: "#ff6b6b" },
  { bg: "#eafaf6", accent: "#16c79a" },
  { bg: "#eef3ff", accent: "#4d7cfe" },
  { bg: "#fff7e6", accent: "#ffab2e" },
  { bg: "#f6efff", accent: "#9b5de5" },
  { bg: "#e9fbff", accent: "#21b8cd" },
];

export function MockBubbly() {
  return (
    <div
      style={{
        background: "#fffaf3",
        color: "#2b2440",
        fontFamily: "ui-rounded, 'Nunito', ui-sans-serif, system-ui, sans-serif",
        minHeight: 640,
      }}
    >
      <header>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 20 }}>Talent<span style={{ color: "#9b5de5" }}>Screen</span></span>
          <span style={{ background: "#9b5de5", color: "#fff", borderRadius: 999, padding: "10px 20px", fontWeight: 800, boxShadow: "0 4px 0 #6f3fb0" }}>Sign up</span>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "30px 24px" }}>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.05 }}>
          Find a job that makes you <span style={{ color: "#ff6b6b" }}>happy</span> 🎉
        </h1>
        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          {["All", "Remote", "Full-time", "Design", "Engineering"].map((c, i) => (
            <span key={c} style={{ background: i === 0 ? "#2b2440" : "#fff", color: i === 0 ? "#fff" : "#2b2440", border: "2px solid #2b2440", borderRadius: 999, padding: "6px 16px", fontWeight: 700 }}>{c}</span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18, marginTop: 24 }}>
          {SAMPLE_JOBS.map((j, i) => {
            const p = POPS[i % POPS.length];
            return (
              <div key={j.title} style={{ background: p.bg, borderRadius: 24, padding: 22, border: `2px solid ${p.accent}` }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{j.title}</h3>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {[j.location, j.type, j.mode].map((t) => (
                    <span key={t} style={{ background: "#fff", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 700, color: p.accent }}>{t}</span>
                  ))}
                </div>
                {j.salary && <div style={{ fontWeight: 800, marginTop: 10 }}>{j.salary}</div>}
                <p style={{ fontSize: 14, marginTop: 10, color: "#5b5470" }}>{j.snippet}</p>
                <span style={{ display: "inline-block", marginTop: 6, background: p.accent, color: "#fff", borderRadius: 999, padding: "9px 18px", fontWeight: 800 }}>Apply now</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

import { SAMPLE_JOBS } from "@/lib/themes";

const IMG = [
  "linear-gradient(135deg,#ff385c,#ff7e5f)",
  "linear-gradient(135deg,#3a7bd5,#00d2ff)",
  "linear-gradient(135deg,#8e2de2,#e94057)",
  "linear-gradient(135deg,#11998e,#38ef7d)",
  "linear-gradient(135deg,#f7971e,#ffd200)",
  "linear-gradient(135deg,#ee0979,#ff6a00)",
];

export function MockAirbnb() {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#222222",
        fontFamily: "ui-sans-serif, 'Circular', -apple-system, sans-serif",
        minHeight: 640,
      }}
    >
      <header style={{ borderBottom: "1px solid #ebebeb" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#ff385c", fontWeight: 800, fontSize: 20 }}>talentscreen</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #dddddd", borderRadius: 999, padding: "8px 8px 8px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", fontSize: 14, fontWeight: 500 }}>
            Any role <span style={{ color: "#ddd" }}>|</span> Anywhere
            <span style={{ background: "#ff385c", color: "#fff", borderRadius: 999, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>⌕</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Sign up</span>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Roles you will love</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 22, marginTop: 20 }}>
          {SAMPLE_JOBS.map((j, i) => (
            <div key={j.title}>
              <div style={{ height: 150, borderRadius: 14, background: IMG[i % IMG.length], position: "relative" }}>
                <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>♥ New</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{j.title}</span>
                  <span style={{ fontSize: 14 }}>★ 4.9</span>
                </div>
                <div style={{ color: "#717171", fontSize: 14, marginTop: 2 }}>{j.location} · {j.mode}</div>
                <div style={{ fontSize: 14, marginTop: 6 }}>
                  <span style={{ fontWeight: 600 }}>{j.salary ?? "Competitive"}</span>
                  <span style={{ color: "#717171" }}> · {j.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

import { SAMPLE_JOBS } from "@/lib/themes";

const BORDER = "3px solid #111111";
const SHADOW = "6px 6px 0 #111111";
const CARD_BG = [
  "#ffffff",
  "#d6ecff",
  "#ffe6f0",
  "#e6ffe9",
  "#ffffff",
  "#fff5d6",
];

export function MockNeobrutalism() {
  return (
    <div
      style={{
        background: "#f4f4ef",
        color: "#111111",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        minHeight: 640,
      }}
    >
      <header style={{ borderBottom: BORDER, background: "#ffd400" }}>
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}
          >
            TALENT//SCREEN
          </span>
          <span
            style={{
              border: BORDER,
              background: "#ffffff",
              boxShadow: "3px 3px 0 #111111",
              padding: "8px 16px",
              fontWeight: 800,
            }}
          >
            SIGN UP
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px" }}>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Find your
          <br />
          next role.
        </h1>

        <div
          style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}
        >
          {["All roles", "Remote", "Full-time", "Design", "Engineering"].map(
            (c, i) => (
              <span
                key={c}
                style={{
                  border: BORDER,
                  background: i === 0 ? "#111111" : "#ffffff",
                  color: i === 0 ? "#ffffff" : "#111111",
                  padding: "6px 14px",
                  fontWeight: 700,
                }}
              >
                {c}
              </span>
            ),
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 22,
            marginTop: 28,
          }}
        >
          {SAMPLE_JOBS.map((j, i) => (
            <div
              key={j.title}
              style={{
                border: BORDER,
                background: CARD_BG[i % CARD_BG.length],
                boxShadow: SHADOW,
                padding: 18,
              }}
            >
              <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>
                {j.title}
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                {[j.location, j.type, j.mode].map((t) => (
                  <span
                    key={t}
                    style={{
                      border: "2px solid #111111",
                      background: "#ffffff",
                      padding: "2px 8px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {j.salary && (
                <div style={{ fontWeight: 800, marginTop: 10 }}>{j.salary}</div>
              )}
              <p style={{ fontSize: 14, marginTop: 10, marginBottom: 14 }}>
                {j.snippet}
              </p>
              <span
                style={{
                  display: "inline-block",
                  border: BORDER,
                  background: "#ffd400",
                  boxShadow: "3px 3px 0 #111111",
                  padding: "8px 16px",
                  fontWeight: 800,
                }}
              >
                APPLY
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

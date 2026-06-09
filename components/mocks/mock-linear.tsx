import { SAMPLE_JOBS } from "@/lib/themes";

const NAV: [string, boolean][] = [
  ["Jobs", true],
  ["Applications", false],
  ["Saved", false],
  ["Settings", false],
];
const DOTS = ["#5e6ad2", "#3fb950", "#d29922", "#8a8f98", "#5e6ad2", "#3fb950"];

export function MockLinear() {
  return (
    <div
      style={{
        background: "#0b0c10",
        color: "#e6e6ea",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        minHeight: 640,
        display: "flex",
      }}
    >
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #1c1d24",
          padding: "18px 14px",
          background: "#0e0f14",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, padding: "6px 8px" }}>
          <span style={{ color: "#5e6ad2" }}>●</span> TalentScreen
        </div>
        <nav
          style={{
            marginTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            fontSize: 13,
          }}
        >
          {NAV.map(([n, active]) => (
            <span
              key={n}
              style={{
                padding: "7px 8px",
                borderRadius: 6,
                background: active ? "#1a1c25" : "transparent",
                color: active ? "#e6e6ea" : "#8a8f98",
              }}
            >
              {n}
            </span>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            borderBottom: "1px solid #1c1d24",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>Jobs</span>
          <span
            style={{
              border: "1px solid #23252d",
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 12.5,
              color: "#8a8f98",
            }}
          >
            Search jobs... ⌘K
          </span>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: 12,
            padding: "10px 20px",
            fontSize: 11.5,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#5c616d",
          }}
        >
          <span>Role</span>
          <span>Type</span>
          <span>Salary</span>
          <span>Status</span>
        </div>

        {SAMPLE_JOBS.map((j, i) => (
          <div
            key={j.title}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              gap: 12,
              alignItems: "center",
              padding: "12px 20px",
              borderTop: "1px solid #15161c",
              fontSize: 13.5,
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{j.title}</div>
              <div style={{ color: "#8a8f98", fontSize: 12, marginTop: 2 }}>
                {j.location} · {j.mode}
              </div>
            </div>
            <span style={{ color: "#8a8f98" }}>{j.type}</span>
            <span style={{ color: "#8a8f98" }}>{j.salary ?? "n/a"}</span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#8a8f98",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: DOTS[i % DOTS.length],
                  display: "inline-block",
                }}
              />
              Open
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

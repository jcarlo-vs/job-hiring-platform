import { SAMPLE_JOBS } from "@/lib/themes";

const NAV: [string, string, boolean][] = [
  ["🔎", "Search", false],
  ["💼", "Jobs", true],
  ["📥", "Applications", false],
  ["⭐", "Saved", false],
  ["⚙️", "Settings", false],
];

export function MockNotion() {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#37352f",
        fontFamily:
          "ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, sans-serif",
        minHeight: 640,
        display: "flex",
      }}
    >
      <aside style={{ width: 230, background: "#fbfbfa", borderRight: "1px solid #ededec", padding: "14px 10px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, padding: "6px 8px" }}>📋 TalentScreen</div>
        <nav style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV.map(([icon, label, active]) => (
            <span key={label} style={{ display: "flex", gap: 8, padding: "6px 8px", borderRadius: 6, fontSize: 14, color: active ? "#37352f" : "#73726e", background: active ? "#efefee" : "transparent" }}>
              <span>{icon}</span>
              {label}
            </span>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "40px 56px" }}>
        <div style={{ fontSize: 40 }}>💼</div>
        <h1 style={{ fontSize: 34, fontWeight: 700, margin: "6px 0 0", letterSpacing: "-0.01em" }}>Open Roles</h1>
        <p style={{ color: "#9b9a97", fontSize: 14, marginTop: 6 }}>A database of every role currently hiring.</p>

        <div style={{ marginTop: 24, border: "1px solid #ededec", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "#f7f7f5", fontSize: 12, color: "#9b9a97", padding: "8px 14px", borderBottom: "1px solid #ededec" }}>
            <span>Aa Role</span>
            <span># Location</span>
            <span>◇ Type</span>
            <span>$ Salary</span>
          </div>
          {SAMPLE_JOBS.map((j) => (
            <div key={j.title} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "11px 14px", borderBottom: "1px solid #f2f2f1", fontSize: 14, alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>{j.title}</span>
              <span style={{ color: "#73726e" }}>{j.location}</span>
              <span><span style={{ background: "#e9e5ff", color: "#5b4bcc", borderRadius: 4, padding: "1px 8px", fontSize: 12 }}>{j.type}</span></span>
              <span style={{ color: "#73726e" }}>{j.salary ?? "Not listed"}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

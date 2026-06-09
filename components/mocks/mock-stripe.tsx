import { SAMPLE_JOBS } from "@/lib/themes";

export function MockStripe() {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#0a2540",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        minHeight: 640,
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #635bff 0%, #7a3ff2 45%, #00d4ff 100%)",
          color: "#ffffff",
          clipPath: "polygon(0 0, 100% 0, 100% 82%, 0 100%)",
          paddingBottom: 70,
        }}
      >
        <header
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 14,
          }}
        >
          <span style={{ fontWeight: 700 }}>TalentScreen</span>
          <nav style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <span style={{ opacity: 0.95 }}>Jobs</span>
            <span style={{ opacity: 0.95 }}>Sign in</span>
            <span
              style={{
                background: "#ffffff",
                color: "#635bff",
                borderRadius: 8,
                padding: "6px 14px",
                fontWeight: 600,
              }}
            >
              Sign up
            </span>
          </nav>
        </header>
        <div
          style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 0" }}
        >
          <h1
            style={{
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              margin: 0,
              maxWidth: 620,
            }}
          >
            The hiring platform for modern teams
          </h1>
          <p
            style={{
              fontSize: 18,
              opacity: 0.92,
              marginTop: 14,
              maxWidth: 520,
            }}
          >
            Explainable AI screening, human decisions. Find your next role
            today.
          </p>
        </div>
      </div>

      <main
        style={{
          maxWidth: 1000,
          margin: "-40px auto 0",
          padding: "0 24px 60px",
          position: "relative",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e6ebf1",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(50,50,93,0.12)",
            padding: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              flex: "1 1 220px",
              border: "1px solid #e6ebf1",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#697386",
            }}
          >
            Search roles
          </span>
          <span
            style={{
              border: "1px solid #e6ebf1",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#697386",
            }}
          >
            Any type
          </span>
          <span
            style={{
              background: "linear-gradient(135deg, #635bff, #9d6bff)",
              color: "#ffffff",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
            }}
          >
            Search
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: 18,
            marginTop: 24,
          }}
        >
          {SAMPLE_JOBS.map((j) => (
            <div
              key={j.title}
              style={{
                background: "#ffffff",
                border: "1px solid #e6ebf1",
                borderRadius: 14,
                boxShadow: "0 4px 16px rgba(50,50,93,0.08)",
                padding: 20,
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
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
                      background: "#f6f9fc",
                      color: "#425466",
                      borderRadius: 6,
                      padding: "3px 10px",
                      fontSize: 12,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {j.salary && (
                <div style={{ fontWeight: 700, marginTop: 10 }}>{j.salary}</div>
              )}
              <p style={{ color: "#425466", fontSize: 14, marginTop: 10 }}>
                {j.snippet}
              </p>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  color: "#635bff",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                View role ›
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

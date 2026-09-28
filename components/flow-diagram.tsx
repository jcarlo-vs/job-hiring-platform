"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./flow-diagram.module.css";

/**
 * The five stages an application passes through, animated.
 *
 * This replaced a static numbered list. The point it makes that a list could
 * not: the applicant is finished after stage two. Everything after that happens
 * without anyone waiting, which is the whole reason screening runs on a queue.
 *
 * Auto-advances, pauses when scrolled out of view or the tab is hidden, and
 * holds still for anyone who asked for reduced motion.
 */

type Stage = {
  label: string;
  title: string;
  body: React.ReactNode;
  icon: React.ReactNode;
  /** Roughly how long this takes in reality. */
  timing: string;
  /** This stage's hue, so the rail reads as a journey rather than one colour. */
  color: string;
};

const STAGES: Stage[] = [
  {
    label: "Write the role",
    title: "You write the criteria once",
    body: (
      <>
        Post the role and list what actually matters. Everything after this is
        measured against <b>your</b> requirements, not a generic keyword match.
      </>
    ),
    timing: "a few minutes, once",
    color: "#5a6478",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    label: "Someone applies",
    title: "A candidate applies in one click",
    body: (
      <>
        They upload a resume and apply. The page comes straight back - they are{" "}
        <b>done here</b>, and nothing keeps them waiting on the AI.
      </>
    ),
    timing: "instant",
    color: "#2f6fd0",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
    ),
  },
  {
    label: "The AI reads it",
    title: "The resume is read in the background",
    body: (
      <>
        A worker pulls the text out of the PDF and weighs it against each
        requirement - <b>what matched, what is missing</b>, and anything worth
        flagging.
      </>
    ),
    timing: "about 6 seconds",
    color: "#7c4dbd",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
        <path d="M8.5 11h5M11 8.5v5" />
      </svg>
    ),
  },
  {
    label: "Scored and ranked",
    title: "Everyone arrives already ranked",
    body: (
      <>
        A 0-100 match score with the reasoning attached, so you can see{" "}
        <b>why</b> someone placed where they did instead of trusting a number.
      </>
    ),
    timing: "waiting when you open it",
    color: "#c07a16",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 20V10" />
        <path d="M12 20V4" />
        <path d="M20 20v-6" />
      </svg>
    ),
  },
  {
    label: "You decide",
    title: "A person makes every call",
    body: (
      <>
        The AI never rejects anyone. It ranks and explains, then stops - every
        advance and every rejection is <b>a human moving a card</b>.
      </>
    ),
    timing: "always yours",
    color: "#0e7c7b",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 11.5V6a1.8 1.8 0 0 1 3.6 0v5" />
        <path d="M12.6 11V9.2a1.7 1.7 0 0 1 3.4 0V12" />
        <path d="M16 11.6a1.7 1.7 0 0 1 3.4 0V15a6 6 0 0 1-6 6h-1.6a5 5 0 0 1-3.9-1.9l-3-3.8a1.7 1.7 0 0 1 2.5-2.3L9 14.4" />
      </svg>
    ),
  },
];

/**
 * Brisk. The rest on each checkpoint is still long enough to read as a stop
 * rather than a flicker, but a full lap now takes about seven seconds, so a
 * visitor sees the whole process without deciding to wait for it.
 */
const TRAVEL = 540;
const DWELL = 936;
const WARP_OUT = 150;

export function FlowDiagram() {
  /** Which checkpoint the light is on, or heading toward. */
  const [at, setAt] = useState(0);
  /** False while in flight. The checkpoint only lights up once it lands. */
  const [landed, setLanded] = useState(true);
  /** Only true while the spark is actually crossing a gap. It is invisible at
      rest, which is also what keeps it from hiding under a puck. */
  const [flying, setFlying] = useState(false);
  /** True for the instant it jumps back to the start without animating. */
  const [warping, setWarping] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);

  const ref = useRef<HTMLDivElement>(null);
  /** Where the loop is up to, so advancing does not re-run the effect below. */
  const cursor = useRef(0);

  // No point animating a section nobody is looking at.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(node);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  /* One loop owns one timer at a time and reschedules itself. Keeping `at` out
     of the deps matters: an earlier version re-ran on every advance and its
     cleanup cancelled the very timer that was meant to end the hop, so the
     rail froze on the first checkpoint. */
  useEffect(() => {
    if (!playing || !visible) return;
    // Read the preference here rather than holding it in state: it avoids a
    // setState inside an effect and there is nothing to re-render for.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const wait = (fn: () => void, ms: number) => {
      timer = setTimeout(() => {
        if (!stopped) fn();
      }, ms);
    };

    function rest() {
      wait(hop, DWELL);
    }

    function hop() {
      const next = cursor.current + 1;

      if (next < STAGES.length) {
        cursor.current = next;
        setLanded(false);
        setFlying(true);
        setAt(next);
        wait(() => {
          setFlying(false);
          setLanded(true);
          rest();
        }, TRAVEL);
        return;
      }

      // Past the last checkpoint: hold dark for a beat, then jump home.
      setLanded(false);
      wait(() => {
        setWarping(true);
        cursor.current = 0;
        setAt(0);
        wait(() => {
          setWarping(false);
          setLanded(true);
          rest();
        }, 80);
      }, WARP_OUT);
    }

    rest();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [playing, visible]);

  const jumpTo = (n: number) => {
    cursor.current = n;
    setWarping(false);
    setFlying(false);
    setAt(n);
    setLanded(true);
    // Turning this off tears down the loop above, cancelling its pending timer.
    setPlaying(false);
  };

  const current = STAGES[at];
  // Checkpoint n sits at exactly n * 25% along the inset rail.
  const position = `${at * 25}%`;

  return (
    <div
      className={[
        styles.wrap,
        playing ? "" : styles.paused,
        flying ? styles.flying : "",
        warping ? styles.warping : "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      style={
        {
          "--stage": current.color,
          "--travel": `${TRAVEL}ms`,
          // One breath per rest, so the pulse cannot drift out of step.
          "--beat": `${DWELL}ms`,
        } as React.CSSProperties
      }
    >
      <ol
        className={styles.rail}
        aria-label="How an application moves through TalentScreen"
      >
        <span className={styles.track} aria-hidden="true" />
        {/* Position goes on inline rather than through a custom property, so
            there is one less indirection between the state and the pixels.
            Checkpoint n sits at exactly n * 25% of the line below, which is
            only true because .spark spans first-centre to last-centre. */}
        <span className={styles.spark} aria-hidden="true">
          <span className={styles.trail} style={{ width: position }} />
          <span className={styles.sparkTail} style={{ left: position }} />
          <span className={styles.sparkDot} style={{ left: position }} />
        </span>

        {STAGES.map((s, n) => {
          const state =
            n === at && landed ? styles.active : n < at ? styles.done : "";
          return (
            <li
              key={s.label}
              className={`${styles.stage} ${state}`}
              style={{ "--stage": s.color } as React.CSSProperties}
              aria-current={n === at && landed ? "step" : undefined}
            >
              <button
                type="button"
                className={styles.puck}
                onClick={() => jumpTo(n)}
                aria-label={`Step ${n + 1}: ${s.label}`}
              >
                {s.icon}
              </button>
              <span className={styles.label}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className={styles.caption} aria-live="polite">
        <p className={styles.captionTitle}>{current.title}</p>
        <p className={styles.captionBody}>{current.body}</p>
      </div>

      <div
        className={styles.foot}
        style={{ "--stage": current.color } as React.CSSProperties}
      >
        <span className={styles.timing}>
          Takes <b>{current.timing}</b>
        </span>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}

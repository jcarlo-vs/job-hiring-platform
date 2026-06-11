"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Phase = "idle" | "loading" | "done";

/**
 * A top progress bar for client-side navigations. The App Router does not expose
 * router events, so we start the bar when an internal link is clicked and finish
 * it when the rendered route (path or query) actually changes. Dependency-free,
 * uses only documented hooks + DOM events.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<Phase>("idle");

  // Start on a client-side internal navigation (a real anchor click).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page (no real navigation) -> don't show the bar.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      setPhase("loading");
    }
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Finish when the route actually changed. Adjust-during-render is React's
  // documented alternative to a setState-in-effect (no cascading renders).
  const routeKey = `${pathname}?${search}`;
  const [prevKey, setPrevKey] = useState(routeKey);
  if (routeKey !== prevKey) {
    setPrevKey(routeKey);
    if (phase === "loading") setPhase("done");
  }

  // Timers: fade out after "done"; safety net so "loading" never sticks.
  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => setPhase("idle"), 450);
      return () => clearTimeout(t);
    }
    if (phase === "loading") {
      const t = setTimeout(() => setPhase("done"), 12000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const style = {
    idle: { width: "0%", opacity: 0, transition: "none" },
    loading: {
      width: "85%",
      opacity: 1,
      transition: "width 10s cubic-bezier(0.1, 0.85, 0.25, 1)",
    },
    done: {
      width: "100%",
      opacity: 0,
      transition: "width 200ms ease-out, opacity 400ms ease-out",
    },
  }[phase];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]"
    >
      <div
        className="bg-primary h-full rounded-r-full"
        style={{ ...style, boxShadow: "0 0 8px rgba(155, 93, 229, 0.7)" }}
      />
    </div>
  );
}

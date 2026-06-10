"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signout } from "@/app/auth/actions";

/**
 * Avatar dropdown for signed-in users. The trigger is a circular initial (no
 * role text cluttering the nav); the menu shows the person's name + role and
 * links to the pages relevant to their role, plus sign out.
 */
export function UserMenu({
  name,
  role,
  company,
}: {
  name: string | null;
  role: "EMPLOYER" | "APPLICANT";
  company: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const display = name?.trim() || "Your account";
  const subtitle =
    role === "EMPLOYER" ? company?.trim() || "Employer" : "Job seeker";
  const initial = display.charAt(0).toUpperCase();

  const links =
    role === "EMPLOYER"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/jobs/new", label: "Post a job" },
        ]
      : [
          { href: "/applications", label: "My applications" },
          { href: "/settings/preferences", label: "Job interests" },
          { href: "/jobs", label: "Find jobs" },
        ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        title={display}
        className="bg-primary text-primary-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-bold transition-transform hover:-translate-y-0.5"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="border-border absolute right-0 z-20 mt-2 w-56 rounded-2xl border-2 bg-white p-2 shadow-lg"
        >
          <div className="border-border border-b px-3 pt-1 pb-2">
            <p className="text-foreground truncate font-bold">{display}</p>
            <p className="text-muted truncate text-xs">{subtitle}</p>
          </div>
          <div className="py-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="text-foreground hover:bg-primary/10 block rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <form action={signout} className="border-border border-t pt-1">
            <button
              type="submit"
              className="text-muted hover:bg-primary/10 hover:text-foreground block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

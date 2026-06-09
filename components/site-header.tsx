import Link from "next/link";

import { signout } from "@/app/auth/actions";
import { getProfile } from "@/lib/auth";

export async function SiteHeader() {
  const profile = await getProfile();

  return (
    <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Talent<span className="text-primary">Screen</span>
        </Link>

        <nav className="text-muted flex items-center gap-4 text-sm">
          <Link
            href="/jobs"
            className="hover:text-foreground transition-colors"
          >
            Jobs
          </Link>
          {profile ? (
            <>
              <Link
                href="/dashboard"
                className="hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              {profile.role === "APPLICANT" && (
                <Link
                  href="/applications"
                  className="hover:text-foreground transition-colors"
                >
                  Applications
                </Link>
              )}
              <span className="hidden text-xs tracking-wide uppercase sm:inline">
                {profile.role === "EMPLOYER" ? "Employer" : "Job seeker"}
              </span>
              <form action={signout}>
                <button
                  type="submit"
                  className="hover:text-foreground cursor-pointer transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

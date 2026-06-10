import Link from "next/link";

import { UserMenu } from "@/components/user-menu";
import { getProfile } from "@/lib/auth";

export async function SiteHeader() {
  const profile = await getProfile();

  return (
    <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-extrabold tracking-tight">
          Talent<span className="text-primary">Screen</span>
        </Link>

        <nav className="text-muted flex items-center gap-5 text-sm">
          <Link
            href="/jobs"
            className="hover:text-foreground font-semibold transition-colors"
          >
            Find Jobs
          </Link>
          {profile ? (
            <UserMenu
              name={profile.full_name}
              role={profile.role}
              company={profile.company_name}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="hover:text-foreground font-semibold transition-colors"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Register Now
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

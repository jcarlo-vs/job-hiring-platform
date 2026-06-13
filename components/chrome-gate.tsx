"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps the global site chrome (header + footer). The marketing homepage ("/")
 * renders its own full-bleed nav and footer, so we hide the global chrome there
 * and render the page as-is; every other route gets the shared header and
 * footer. The header is passed in as an already-rendered server node, so its
 * data fetching still runs on the server.
 */
export function ChromeGate({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  );
}

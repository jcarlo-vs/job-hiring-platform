import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Suspense } from "react";

import { NavProgress } from "@/components/nav-progress";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const appSans = Nunito({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TalentScreen - AI-assisted hiring",
  description:
    "Post jobs, collect applications, and get explainable AI resume screening that supports hiring managers - the human always makes the final call.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${appSans.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-border border-t">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold">
                Talent<span className="text-primary">Screen</span>
              </p>
              <p className="text-muted mt-1 text-sm">
                AI-powered screening. Human-powered decisions.
              </p>
            </div>
            <p className="text-muted text-xs">&copy; 2026 TalentScreen</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

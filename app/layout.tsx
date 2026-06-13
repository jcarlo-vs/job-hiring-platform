import type { Metadata } from "next";
import { Albert_Sans, Bricolage_Grotesque } from "next/font/google";
import { Suspense } from "react";

import { ChromeGate } from "@/components/chrome-gate";
import { NavProgress } from "@/components/nav-progress";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const appSans = Albert_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});
const appDisplay = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
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
    <html
      lang="en"
      className={`${appSans.variable} ${appDisplay.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <ChromeGate
          header={<SiteHeader />}
          footer={
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
          }
        >
          {children}
        </ChromeGate>
      </body>
    </html>
  );
}

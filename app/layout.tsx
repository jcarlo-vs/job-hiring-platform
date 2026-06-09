import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-border text-muted border-t">
          <div className="mx-auto max-w-5xl px-6 py-8 text-sm">
            Built with Next.js, Supabase, Inngest, and Claude - a portfolio
            project.
          </div>
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import FixoraCursor from "@/components/FixoraCursor";
import "./globals.css";

// Geist: headings, navigation, buttons, prominent UI.
// Inter: body text, descriptions, labels, supporting information.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Fixora",
  description:
    "Make sense of billing or payment problems, build a clear case, and decide what to do next.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-background font-body text-foreground antialiased">
        <FixoraCursor />
        {children}
      </body>
    </html>
  );
}

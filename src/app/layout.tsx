import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { AppStoreProvider } from "@/lib/store";
import "./globals.css";

const heading = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Martijnfit — Track every session, plan every week",
  description:
    "A beautiful multi-sport tracker and planner. Auto-log your sessions, see your consistency at a glance, and plan next week around your habits and calendar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${heading.variable} ${body.variable} antialiased`}>
        <AppStoreProvider>{children}</AppStoreProvider>
      </body>
    </html>
  );
}

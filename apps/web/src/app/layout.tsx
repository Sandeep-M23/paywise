import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/context/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  // No title template: every route's title comes from HEADER_TITLE, already branded.
  title: "Paywise",
  description: "Salary management for HR: records, history, imports and pay insights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets the theme class before React hydrates.
    <html
      lang="en"
      className={cn("font-sans antialiased", inter.variable)}
      suppressHydrationWarning
    >
      <body className="bg-canvas min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

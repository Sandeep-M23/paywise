import { Providers } from "@/context/providers";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Paywise",
  description: "Salary management for HR: records, history, imports and pay insights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
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

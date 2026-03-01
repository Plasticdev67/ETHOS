import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutProvider } from "@/components/layout/layout-context";
import { LayoutShell } from "@/components/layout/layout-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/components/session-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ethos Mk.1 | Tailored for MME",
  description: "Ethos Mk.1 — Business management system tailored for MM Engineered Solutions Ltd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <TooltipProvider>
            <LayoutProvider>
              <LayoutShell>{children}</LayoutShell>
            </LayoutProvider>
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

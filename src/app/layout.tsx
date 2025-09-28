import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import Header from "./markets/header";
import Note from "./markets/note";
import { validateConfig } from "@/lib/config";
import { ChainProvider } from "@/contexts/ChainContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "HedgX - Hedge. Fix. Relax.",
  description: "HedgX is a peer-to-peer funding-rate swap protocol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Validate configuration on app start
  if (typeof window === "undefined") {
    validateConfig();
  }

  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <ThirdwebProvider>
          <ChainProvider>
            <Header />
            <main className="p-4 pb-10 flex flex-col justify-between container max-w-screen-2xl mx-auto min-h-[calc(100vh-4rem)]">
              {children}
            </main>
            <Note />
          </ChainProvider>
        </ThirdwebProvider>
      </body>
    </html>
  );
}

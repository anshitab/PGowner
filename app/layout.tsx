import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_Devanagari, Playfair_Display } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifDev = Noto_Serif_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "700"],
  style: ["normal"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "ProManage AI — Property Management Dashboard",
  description: "Smart property management system with AI-powered insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifDev.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

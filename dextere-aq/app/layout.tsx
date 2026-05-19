import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DEXTERE | Air Quality Intelligence Terminal",
  description:
    "Global Air Quality Intelligence — Powered by OpenAQ. A DEXTERE Capital PoC.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-obsidian text-white antialiased">{children}</body>
    </html>
  );
}

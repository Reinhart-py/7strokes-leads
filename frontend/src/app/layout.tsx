import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "7strokes — Local Business Lead Finder",
  description: "Find local business leads, verified phone numbers, and company details with fast multi-region scanning.",
  icons: {
    icon: "https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png",
    shortcut: "https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png",
    apple: "https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png"
  },
  openGraph: {
    title: "7strokes — Local Business Lead Finder",
    description: "Extract verified business contacts, categories, and addresses with high-speed multi-region scanning.",
    images: ["https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "7strokes — Local Business Lead Finder",
    description: "Extract verified business contacts, categories, and addresses with high-speed multi-region scanning.",
    images: ["https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

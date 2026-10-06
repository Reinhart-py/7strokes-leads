import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const LOGO_URL = "https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://7strokes.maxvendor47.workers.dev"),
  title: "7strokes — Local Business Lead Finder",
  description: "Extract verified business contacts, categories, and addresses with high-speed multi-region scanning.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: LOGO_URL, type: "image/png" }
    ],
    shortcut: [LOGO_URL],
    apple: [LOGO_URL]
  },
  openGraph: {
    title: "7strokes — Local Business Lead Finder",
    description: "Extract verified business contacts, categories, and addresses with high-speed multi-region scanning.",
    url: "https://7strokes.maxvendor47.workers.dev",
    siteName: "7strokes",
    type: "website",
    images: [
      {
        url: LOGO_URL,
        width: 1200,
        height: 630,
        alt: "7strokes Logo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "7strokes — Local Business Lead Finder",
    description: "Extract verified business contacts, categories, and addresses with high-speed multi-region scanning.",
    images: [LOGO_URL]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="icon" type="image/png" href={LOGO_URL} />
        <link rel="apple-touch-icon" href={LOGO_URL} />
        <link rel="image_src" href={LOGO_URL} />
        <meta property="og:image" content={LOGO_URL} />
        <meta property="og:image:secure_url" content={LOGO_URL} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:image" content={LOGO_URL} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

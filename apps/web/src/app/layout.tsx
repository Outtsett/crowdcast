import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: { default: "Crowdcast", template: "%s | Crowdcast" },
  description: "Create polls, vote, and discover what the crowd thinks. The community polling platform.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://crowdcast.app"),
  openGraph: {
    type: "website",
    siteName: "Crowdcast",
    title: "Crowdcast \u2014 Community Polling Platform",
    description: "Create polls, vote, and discover what the crowd thinks.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crowdcast \u2014 Community Polling Platform",
    description: "Create polls, vote, and discover what the crowd thinks.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}

import { Space_Grotesk, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Three families, three jobs.
 *
 * Self-hosted and subset by next/font, so there is no render-blocking request
 * to Google and no layout shift. `display: swap` plus a matched fallback keeps
 * first paint honest.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/* Sora rather than Inter for body copy. Inter is the default of every dashboard
   on the internet and reads as system-neutral; Sora is a geometric sans with
   noticeably more character in its terminals and apertures, and it holds up at
   the larger body size below. */
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sora",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const SITE = "https://fraudforge-site.vercel.app";

export const metadata = {
  metadataBase: new URL(SITE),
  applicationName: "FraudForge",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FraudForge",
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  title: "FraudForge | Adversarial fraud defense, measured not asserted",
  description:
    "A red team that writes new payment fraud and a blue team that learns from what it missed. Every figure on this page is computed, not claimed.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "FraudForge",
    title: "FraudForge | Adversarial fraud defense, measured not asserted",
    description:
      "A red team that writes new payment fraud and a blue team that learns from what it missed.",
    url: SITE,
  },
  twitter: {
    card: "summary_large_image",
    title: "FraudForge | Adversarial fraud defense",
    description:
      "A red team that writes new payment fraud and a blue team that learns from what it missed.",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#030304",
  colorScheme: "dark",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${sora.variable} ${jetbrainsMono.variable}`}
    >
      <body className="grain font-sans antialiased text-fg bg-base">{children}</body>
    </html>
  );
}

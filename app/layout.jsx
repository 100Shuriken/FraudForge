import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const SITE = "https://fraudforge-site.vercel.app";

export const metadata = {
  metadataBase: new URL(SITE),
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
  themeColor: "#0b0e16",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="grain font-sans">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { THEME_INIT_SCRIPT_SRC } from "@/shared/lib/theme";
import { cn } from "@/shared/lib/utils";
import { AppProviders } from "@/shared/providers/app-providers";

/** Angular loads Roboto 300/400/500/700 — match for visual parity. */
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Powerhouse Club",
    template: "%s · Powerhouse Club",
  },
  description: "Powerhouse Club platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full font-sans antialiased", geistMono.variable, roboto.variable)}
    >
      <body className="flex min-h-full flex-col">
        <Script src={THEME_INIT_SCRIPT_SRC} strategy="beforeInteractive" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

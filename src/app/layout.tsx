import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import "./[locale]/globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Vetta",
    template: "%s — Vetta",
  },
  description:
    "Discover trending open-source repositories on GitHub. Track daily, weekly, and monthly rankings with real-time metrics.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4000",
  ),
  openGraph: {
    title: "Vetta",
    description:
      "Discover trending open-source repositories on GitHub with real-time metrics.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={routing.defaultLocale}
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

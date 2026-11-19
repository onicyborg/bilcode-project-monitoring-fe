import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { IBM_Plex_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Bilcode Project Monitoring",
  description:
    "Kontrol sesi Bilcode, pemantauan proyek, dan notifikasi WhatsApp.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn("font-sans", ibmPlexSans.variable)}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

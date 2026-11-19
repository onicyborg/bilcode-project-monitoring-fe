import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Bilcode Project Monitoring",
  description:
    "Kontrol sesi Bilcode, pemantauan proyek, dan notifikasi WhatsApp.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

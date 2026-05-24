import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weather Next.js",
  description: "A weather app built with Next.js App Router",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

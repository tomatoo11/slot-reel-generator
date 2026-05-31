import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tomatoo Mood Decay NFT",
  description: "受け取ってから時間が経つほど姿が変わる、Base上のトマト王NFTです。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tomatoo Mood Decay NFT",
  description: "A dynamic ERC-1155 tomato king edition that decays as time passes after receiving it."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

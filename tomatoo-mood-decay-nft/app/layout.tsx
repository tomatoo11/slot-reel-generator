import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tomatoo Mood Decay NFT",
  description: "A dynamic ERC-721 tomato king that decays as time passes after transfer."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

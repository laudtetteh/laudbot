import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaudBot",
  description: "A privacy-aware professional agent",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

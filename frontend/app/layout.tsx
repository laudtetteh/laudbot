import type { Metadata } from "next";
import Nav from "@/components/Nav";
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
      <body className="bg-zinc-950 text-white antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}

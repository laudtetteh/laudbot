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
    <html lang="en" className="h-full">
      <body className="flex h-full flex-col bg-zinc-950 text-white antialiased">
        <Nav />
        <main className="flex flex-1 flex-col min-h-0">{children}</main>
      </body>
    </html>
  );
}

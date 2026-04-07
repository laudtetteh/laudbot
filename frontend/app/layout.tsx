import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaudBot",
  description: "A privacy-aware professional agent",
};

/**
 * Inline script injected before React hydrates.
 * Reads the stored theme preference and adds the "dark" class to <html>
 * synchronously — prevents any flash of the wrong theme on load.
 * Defaults to dark if no preference is stored.
 */
const ANTI_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
      </head>
      <body className="flex h-full flex-col bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-white">
        <Nav />
        <main className="flex flex-1 flex-col min-h-0">{children}</main>
      </body>
    </html>
  );
}

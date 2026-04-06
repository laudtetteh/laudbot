"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-zinc-900 transition-opacity hover:opacity-70 dark:text-white"
        >
          LaudBot
        </Link>

        {/* Desktop nav links + theme toggle */}
        <div className="hidden items-center gap-4 sm:flex">
          <ul className="flex items-center gap-6">
            {links.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`text-sm transition-colors ${
                      active
                        ? "font-medium text-zinc-900 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ThemeToggle />
        </div>

        {/* Mobile: hamburger + theme toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            className="flex flex-col items-center justify-center gap-1.5 p-1"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span
              className={`block h-px w-5 bg-zinc-500 transition-transform duration-200 dark:bg-zinc-400 ${menuOpen ? "translate-y-[3px] rotate-45" : ""}`}
            />
            <span
              className={`block h-px w-5 bg-zinc-500 transition-opacity duration-200 dark:bg-zinc-400 ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-px w-5 bg-zinc-500 transition-transform duration-200 dark:bg-zinc-400 ${menuOpen ? "-translate-y-[9px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="animate-slide-down border-t border-zinc-200/60 pb-2 pt-3 dark:border-zinc-800/60 sm:hidden">
          <ul className="mx-auto flex max-w-4xl flex-col gap-1">
            {links.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}

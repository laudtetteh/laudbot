"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Reads and writes the active theme.
 *
 * Resolution order on mount:
 * 1. Check the actual <html> class (set by the anti-flash inline script in layout.tsx)
 * 2. Fall back to "dark" if indeterminate
 *
 * Persists choice to localStorage under the key "theme".
 * Adds/removes the "dark" class on <html> on toggle.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read from the actual DOM state — the anti-flash script already applied it.
    const active = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(active);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  return { theme, toggleTheme };
}

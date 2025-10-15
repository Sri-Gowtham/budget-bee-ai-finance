"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme on initial load
    const savedTheme = localStorage.getItem("theme") || "auto";
    applyTheme(savedTheme);

    // Apply font size on initial load
    const savedFontSize = localStorage.getItem("fontSize") || "medium";
    applyFontSize(savedFontSize);

    // Listen for localStorage changes (custom event for same-window updates)
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if (e instanceof StorageEvent) {
        if (e.key === "theme" && e.newValue) {
          applyTheme(e.newValue);
        }
        if (e.key === "fontSize" && e.newValue) {
          applyFontSize(e.newValue);
        }
      } else {
        // CustomEvent from same window
        const detail = (e as CustomEvent).detail;
        if (detail.key === "theme") {
          applyTheme(detail.value);
        }
        if (detail.key === "fontSize") {
          applyFontSize(detail.value);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleStorageChange as EventListener);

    // Listen for system theme changes when in auto mode
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      const currentTheme = localStorage.getItem("theme");
      if (currentTheme === "auto" || !currentTheme) {
        applyTheme("auto");
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleStorageChange as EventListener);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  const applyTheme = (theme: string) => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else if (theme === "light") {
      html.classList.remove("dark");
    } else if (theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
  };

  const applyFontSize = (fontSize: string) => {
    const body = document.body;
    body.classList.remove("font-small", "font-medium", "font-large", "font-extra-large");
    body.classList.add(`font-${fontSize}`);
  };

  return <>{children}</>;
}
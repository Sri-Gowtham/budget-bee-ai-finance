"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // avoid hydration mismatch
    setIsMounted(true);
  }, []);

  if (!isMounted) return <>{children}</>;

  return (
    <div className="relative">
      {/* Subtle bee-themed animated gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-40 dark:opacity-25 [mask-image:radial-gradient(50%_50%_at_50%_40%,black,transparent_70%)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-amber-100 to-transparent dark:from-yellow-900/30 dark:via-amber-900/20 dark:to-transparent animate-pulse" />
      </div>

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="will-change-transform"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* Floating bee sparkles */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10">
        <div className="mx-auto h-24 w-full max-w-6xl bg-[radial-gradient(circle_at_20%_20%,#fde68a_0%,transparent_35%),radial-gradient(circle_at_80%_0%,#fcd34d_0%,transparent_25%)] blur-2xl opacity-50 dark:opacity-30" />
      </div>
    </div>
  );
};

export default PageTransition;
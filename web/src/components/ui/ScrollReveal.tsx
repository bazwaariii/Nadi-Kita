"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  /** Dipertahankan untuk kompatibilitas; semua arah kini berupa pudar halus. */
  direction?: "up" | "left" | "right" | "scale";
}

/**
 * Pemunculan halus saat bagian masuk layar.
 * Sesuai MASTER.md bagian 7: hanya opasitas + geser 8px, 320ms, tanpa efek
 * berlebihan. Menghormati prefers-reduced-motion (konten langsung tampil).
 */
export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${Math.min(delayMs, 120)}ms`,
        transitionDuration: "320ms",
        transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        transitionProperty: "opacity, transform",
      }}
      className={`${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

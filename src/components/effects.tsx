"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Storefront polish: reveal-on-scroll, header shadow on scroll, pointer glow on cards. No layout impact without JS. */
export function Effects() {
  const path = usePathname();
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const header = document.querySelector("header[data-site-header]");
    const onScroll = () => header?.toggleAttribute("data-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let io: IntersectionObserver | undefined;
    if (!reduce && "IntersectionObserver" in window) {
      const targets = document.querySelectorAll<HTMLElement>("main section, main .card, main article, main [data-reveal]");
      io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add("reveal-in"); io!.unobserve(e.target); }
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      targets.forEach((el, i) => {
        if (el.closest("[data-no-reveal]") || el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // above the fold: show at once
        el.classList.add("reveal");
        el.style.setProperty("--reveal-delay", `${(i % 4) * 70}ms`);
        io!.observe(el);
      });
    }
    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".fx-glow");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("pointermove", onMove); io?.disconnect(); };
  }, [path]);
  return null;
}

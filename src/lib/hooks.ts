"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Ported from GEO-UI-Version-5/src/lib/hooks.js (typed). No animation library —
// these back the CSS-driven motion primitives.

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/**
 * Fires once when an element is (or scrolls) into view. Reveals immediately if
 * already on screen and always reveals via a short fallback timer, so content
 * can never get stuck hidden.
 */
export function useInView(
  options: IntersectionObserverInit = { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
): [React.RefObject<any>, boolean] {
  const ref = useRef<any>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    if (rect.top < vh * 1.15 && rect.bottom > -vh * 0.15) {
      setInView(true);
      return;
    }
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setInView(true);
    };
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) reveal();
      }, options);
      io.observe(el);
    }
    const t = setTimeout(reveal, 700);
    return () => {
      io?.disconnect();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  return [ref, inView];
}

export function useCountUp(
  target: number,
  { duration = 1000, start = 0, decimals = 0, play = true } = {}
): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : start);
  const raf = useRef(0);
  useEffect(() => {
    if (!play) return;
    if (reduced) {
      setValue(target);
      return;
    }
    const t0 = performance.now();
    const from = start;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, start, play, reduced]);
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return matches;
}

/** localStorage-backed state helper (SSR-safe). */
export function usePersistentState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          if (value == null) window.localStorage.removeItem(key);
          else window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
          /* ignore */
        }
        return value;
      });
    },
    [key]
  );
  return [state, set];
}

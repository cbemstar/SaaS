"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A thin top progress bar that appears the instant a navigation starts and
 * completes when the new route commits. Pure CSS transforms (no deps), and it
 * trickles forward so even a multi-second server render feels responsive.
 *
 * Pairs with the per-route loading.tsx skeletons: this is the "something is
 * happening" signal, the skeleton is the "here's the shape of what's coming".
 */
function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTrickle = useCallback(() => {
    if (trickle.current) {
      clearInterval(trickle.current);
      trickle.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (hide.current) clearTimeout(hide.current);
    stopTrickle();
    setVisible(true);
    setProgress(0.08);
    trickle.current = setInterval(() => {
      setProgress((p) => (p >= 0.9 ? p : p + (0.9 - p) * 0.12));
    }, 220);
  }, [stopTrickle]);

  const finish = useCallback(() => {
    stopTrickle();
    setProgress(1);
    hide.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
  }, [stopTrickle]);

  // A navigation committed (route or query changed) -> finish the bar.
  useEffect(() => {
    if (visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Detect navigation starts from link clicks and browser back/forward.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    function onPopState() {
      start();
    }
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
      window.removeEventListener("popstate", onPopState);
      stopTrickle();
      if (hide.current) clearTimeout(hide.current);
    };
  }, [start, stopTrickle]);

  if (!visible) return null;
  return (
    <div
      className="nav-progress"
      style={{ transform: `scaleX(${progress})`, opacity: progress >= 1 ? 0 : 1 }}
      role="presentation"
      aria-hidden
    />
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}

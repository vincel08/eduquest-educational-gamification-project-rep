import { useEffect, useRef } from "react";

/**
 * Calls onRefresh when the window regains focus or the tab becomes visible.
 * Coalesces focus + visibility into one refresh (browsers often fire both).
 */
export default function useRefreshOnFocus(onRefresh, enabled = true) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    function refresh() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      const now = Date.now();
      // Focus and visibilitychange often fire together when returning to a tab.
      if (now - lastRunRef.current < 400) return;
      lastRunRef.current = now;
      onRefreshRef.current?.();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}

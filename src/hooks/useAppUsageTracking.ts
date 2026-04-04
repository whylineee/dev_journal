import { useEffect } from "react";
import { format } from "date-fns";
import { readAppUsageMap, writeAppUsageMap } from "../utils/analyticsStorage";

export const useAppUsageTracking = () => {
  useEffect(() => {
    const addUsageMs = (elapsedMs: number) => {
      if (elapsedMs <= 0) {
        return;
      }

      const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1000));
      const usageMap = readAppUsageMap();
      const today = format(new Date(), "yyyy-MM-dd");
      usageMap[today] = (usageMap[today] ?? 0) + elapsedSeconds;
      writeAppUsageMap(usageMap);
    };

    const isActive = () => document.visibilityState === "visible" && document.hasFocus();
    let lastTick = Date.now();
    let wasActive = isActive();

    const handleTick = () => {
      const now = Date.now();
      if (wasActive) {
        addUsageMs(now - lastTick);
      }
      lastTick = now;
      wasActive = isActive();
    };

    const interval = window.setInterval(handleTick, 15000);
    const syncActiveState = () => {
      handleTick();
    };

    window.addEventListener("focus", syncActiveState);
    window.addEventListener("blur", syncActiveState);
    document.addEventListener("visibilitychange", syncActiveState);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncActiveState);
      window.removeEventListener("blur", syncActiveState);
      document.removeEventListener("visibilitychange", syncActiveState);
      handleTick();
    };
  }, []);
};

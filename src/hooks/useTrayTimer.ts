import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export const useTrayTimer = () =>
  useCallback((text: string | null) => {
    invoke("set_tray_timer", { text }).catch(() => {});
  }, []);

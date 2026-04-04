import { useCallback, useRef } from "react";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";

export const useNotificationPermission = () => {
  const notificationPermissionRequestedRef = useRef(false);
  const notificationPermissionDeniedRef = useRef(false);

  return useCallback(async () => {
    try {
      const permissionGranted = await isPermissionGranted();
      if (permissionGranted) {
        notificationPermissionDeniedRef.current = false;
        notificationPermissionRequestedRef.current = true;
        return true;
      }

      if (notificationPermissionDeniedRef.current || notificationPermissionRequestedRef.current) {
        return false;
      }

      notificationPermissionRequestedRef.current = true;
      const permission = await requestPermission();
      const granted = permission === "granted";
      notificationPermissionDeniedRef.current = !granted;

      return granted;
    } catch {
      notificationPermissionDeniedRef.current = true;
      return false;
    }
  }, []);
};

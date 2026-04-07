const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

export const isSafeExternalUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return SAFE_EXTERNAL_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};

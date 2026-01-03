import { useState, useCallback } from "react";

export function useRateLimit(cooldownMs: number = 2000) {
  const [isLimited, setIsLimited] = useState(false);

  const execute = useCallback(
    async (callback: () => Promise<void> | void) => {
      if (isLimited) return;

      setIsLimited(true);
      try {
        await callback();
      } finally {
        setTimeout(() => setIsLimited(false), cooldownMs);
      }
    },
    [isLimited, cooldownMs],
  );

  return { execute, isLimited };
}

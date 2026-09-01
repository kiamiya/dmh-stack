import { useCallback, useEffect, useState } from "react";
import { getStoredTheme, nextTheme, resolveEffectiveTheme, setStoredTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia(DARK_MEDIA_QUERY).matches;
  document.documentElement.dataset.theme = resolveEffectiveTheme(theme, prefersDark);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme(localStorage));

  useEffect(() => {
    applyTheme(theme);
    setStoredTheme(localStorage, theme);

    if (theme !== "system") return;
    const media = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = () => applyTheme(theme);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const cycleTheme = useCallback(() => setTheme((t) => nextTheme(t)), []);

  return { theme, setTheme, cycleTheme };
}

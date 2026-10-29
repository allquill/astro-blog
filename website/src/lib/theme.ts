// Client-side theme state, shared by the header toggle and the gallery Light/Dark/Auto pills.
// Same contract as the pre-paint script in BaseLayout.astro: localStorage.theme is 'light' or
// 'dark', and no key means "follow the system" (that script keeps following it live).

import { track } from './analytics';

export type ThemeMode = 'light' | 'dark' | 'auto';

const KEY = 'theme';

export function getMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'auto';
}

/** `source` names the control that changed it, for analytics (e.g. 'header', 'gallery'). */
export function setMode(mode: ThemeMode, source?: string) {
  try {
    if (mode === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {}
  const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  window.dispatchEvent(new CustomEvent<{ mode: ThemeMode }>('themechange', { detail: { mode } }));
  if (source) track('theme_change', { mode, source });
}

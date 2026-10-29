export type Theme = 'light' | 'dark' | 'auto';

export function currentTheme(): Theme {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

/** Applies and remembers a theme (index.html applies it again before paint on the next load). */
export function applyTheme(t: Theme) {
  try {
    if (t === 'auto') localStorage.removeItem('theme');
    else localStorage.setItem('theme', t);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

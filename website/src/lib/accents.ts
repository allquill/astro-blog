// Topic accent colours. Keys are the CMS select values; classes are spelled out in full so
// Tailwind's scanner picks them up.
export const ACCENTS = {
  teal: { label: 'Teal', text: 'text-brand-700 dark:text-brand-300', bg: 'bg-brand-500/10 dark:bg-brand-400/15', ring: 'ring-brand-500/20', glow: 'from-brand-500/25', solid: 'bg-brand-600' },
  sky: { label: 'Sky', text: 'text-sky-600 dark:text-sky-300', bg: 'bg-sky-500/10 dark:bg-sky-400/15', ring: 'ring-sky-500/20', glow: 'from-sky-500/25', solid: 'bg-sky-600' },
  blue: { label: 'Blue', text: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-500/10 dark:bg-blue-400/15', ring: 'ring-blue-500/20', glow: 'from-blue-500/25', solid: 'bg-blue-600' },
  amber: { label: 'Amber', text: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-500/10 dark:bg-amber-400/15', ring: 'ring-amber-500/20', glow: 'from-amber-500/25', solid: 'bg-amber-600' },
  orange: { label: 'Orange', text: 'text-orange-600 dark:text-orange-300', bg: 'bg-orange-500/10 dark:bg-orange-400/15', ring: 'ring-orange-500/20', glow: 'from-orange-500/25', solid: 'bg-orange-600' },
  rose: { label: 'Rose', text: 'text-rose-600 dark:text-rose-300', bg: 'bg-rose-500/10 dark:bg-rose-400/15', ring: 'ring-rose-500/20', glow: 'from-rose-500/25', solid: 'bg-rose-600' },
  slate: { label: 'Slate', text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/10 dark:bg-slate-400/15', ring: 'ring-slate-500/20', glow: 'from-slate-500/25', solid: 'bg-slate-600' },
} as const;

export type AccentName = keyof typeof ACCENTS;

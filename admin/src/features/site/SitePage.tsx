import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { ContentService, type HomeDto, type SiteSettingsDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { Checkbox, ErrorBox, Field, Notice, PageHeader, Spinner } from '@/shared/ui';
import { SocialLinksEditor } from '../authors/AuthorsPage';
import { BRAND_COLORS, BRAND_PRESETS, SHARE_NETWORKS } from '../editor/options';

type NavLink = SiteSettingsDto['nav'][number];

function LinksEditor({ value, onChange }: { value: NavLink[]; onChange: (v: NavLink[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input className="input w-40" placeholder="Label" value={l.label} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input className="input" placeholder="/about/ or https://…" value={l.href} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
          <button type="button" className="btn-icon" aria-label="Remove link" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="size-4" /></button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...value, { label: '', href: '' }])}><Plus className="size-4" /> Add link</button>
    </div>
  );
}

type BrandColor = SiteSettingsDto['brandColor'];

function Swatch({ color, selected, onPick, label, size = 'size-8' }: { color: string; selected: boolean; onPick: () => void; label: string; size?: string }) {
  const [, main] = BRAND_COLORS[color]?.shades ?? ['', '#64748b'];
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={`relative inline-flex ${size} items-center justify-center rounded-full ring-offset-2 transition hover:scale-105 dark:ring-offset-slate-900 ${selected ? 'ring-2 ring-slate-900 dark:ring-white' : 'ring-1 ring-black/10'}`}
      style={{ background: main }}
    >
      {selected && <Check className="size-4 text-white" aria-hidden />}
    </button>
  );
}

/** Brand colour of the site and its e-mails: a suggested theme, or any Tailwind colour family. */
function BrandColorPicker({ value, onChange }: { value: string; onChange: (v: BrandColor) => void }) {
  const [light, main, dark] = BRAND_COLORS[value]?.shades ?? BRAND_COLORS.teal.shades;
  const preset = BRAND_PRESETS.find((p) => p.color === value);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Themes</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {BRAND_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={value === p.color}
              onClick={() => onChange(p.color as BrandColor)}
              className={`inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm ring-1 transition ${value === p.color ? 'font-medium ring-2 ring-slate-900 dark:ring-white' : 'ring-slate-300 hover:bg-slate-50 dark:ring-white/15 dark:hover:bg-white/5'}`}
            >
              <span className="size-6 rounded-full ring-1 ring-black/10" style={{ background: BRAND_COLORS[p.color]!.shades[1] }} aria-hidden />
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Or any Tailwind colour</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(BRAND_COLORS).map(([k, c]) => (
            <Swatch key={k} color={k} label={c.label} selected={value === k} onPick={() => onChange(k as BrandColor)} />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg p-3 ring-1 ring-slate-200 dark:ring-white/10" aria-label="Preview">
        <span className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: main }}>Subscribe</span>
        <span className="text-sm font-medium underline" style={{ color: dark }}>A link in a post</span>
        <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: light, color: dark }}>Topic</span>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{preset ? `${preset.label} theme` : BRAND_COLORS[value]?.label}</span>
      </div>
    </div>
  );
}

function SiteForm({ initial, canSave }: { initial: SiteSettingsDto; canSave: boolean }) {
  const qc = useQueryClient();
  const [f, setF] = useState(initial);
  const save = useMutation({ mutationFn: () => ContentService.contentControllerSaveSite({ requestBody: f }), onSuccess: (s) => qc.setQueryData(['site'], s) });
  const errs = fieldErrors(save.error);
  const set = <K extends keyof SiteSettingsDto>(k: K, v: SiteSettingsDto[K]) => setF({ ...f, [k]: v });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit} className="card space-y-5 p-5">
      <h2 className="font-semibold">Site</h2>
      <fieldset disabled={!canSave} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Blog name" error={errs.siteName}><input className="input" value={f.siteName} onChange={(e) => set('siteName', e.target.value)} /></Field>
          <Field label="Tagline" error={errs.tagline}><input className="input" value={f.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
        </div>
        <Field label="Description" hint="The home page's description for search engines and link previews." error={errs.description}>
          <textarea className="input min-h-20" value={f.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Publisher" hint="Organisation named in structured data" error={errs.publisher}><input className="input" value={f.publisher} onChange={(e) => set('publisher', e.target.value)} /></Field>
          <Field label="Contact e-mail" error={errs.email}><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        </div>
        <Field label="Social profiles" hint="Icons in the footer." error={errs.social}>
          <SocialLinksEditor value={f.social as never} onChange={(v) => set('social', v as never)} />
        </Field>
        <Field label="Header links" hint="After Blog and Topics (pages can add themselves too)." error={errs.nav}>
          <LinksEditor value={f.nav} onChange={(v) => set('nav', v)} />
        </Field>
        <Field label="Footer links" error={errs.footerLinks}>
          <LinksEditor value={f.footerLinks} onChange={(v) => set('footerLinks', v)} />
        </Field>
        <div>
          <p className="label">Brand colour</p>
          <p className="mt-1 mb-3 text-xs text-slate-500 dark:text-slate-400">Buttons, links and highlights on the site, its icon and QR codes, and the e-mails. The admin keeps its own colours.</p>
          <BrandColorPicker value={f.brandColor} onChange={(v) => set('brandColor', v)} />
          {errs.brandColor && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errs.brandColor}</p>}
        </div>
        <div>
          <p className="label">Share buttons on posts</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {Object.entries(SHARE_NETWORKS).map(([k, label]) => (
              <Checkbox key={k} checked={f.shareNetworks.includes(k as never)} label={label} onChange={(on) => set('shareNetworks', (on ? [...f.shareNetworks, k] : f.shareNetworks.filter((x) => x !== k)) as never)} />
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subscribe box title" error={errs.subscribeTitle}><input className="input" value={f.subscribeTitle} onChange={(e) => set('subscribeTitle', e.target.value)} /></Field>
          <Field label="Posts per page" error={errs.postsPerPage}><input className="input" type="number" min={3} max={48} value={f.postsPerPage} onChange={(e) => set('postsPerPage', Number(e.target.value) || 12)} /></Field>
        </div>
        <Field label="Subscribe box text" error={errs.subscribeText}><textarea className="input min-h-16" value={f.subscribeText} onChange={(e) => set('subscribeText', e.target.value)} /></Field>
        <Field label="IndexNow key" hint="Optional: 8–128 letters, digits or dashes. The site serves it at /<key>.txt for `pnpm run indexnow`." error={errs.indexNowKey}>
          <input className="input font-mono text-xs" value={f.indexNowKey} onChange={(e) => set('indexNowKey', e.target.value)} />
        </Field>
      </fieldset>
      <ErrorBox error={Object.keys(errs).length ? null : save.error} />
      {save.isSuccess && <Notice tone="success">Saved. The site shows it within a few seconds.</Notice>}
      {canSave && <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={save.isPending}>Save site settings</button></div>}
    </form>
  );
}

function HomeForm({ initial, canSave }: { initial: HomeDto; canSave: boolean }) {
  const qc = useQueryClient();
  const [f, setF] = useState(initial);
  const save = useMutation({ mutationFn: () => ContentService.contentControllerSaveHome({ requestBody: f }), onSuccess: (s) => qc.setQueryData(['home'], s) });
  const errs = fieldErrors(save.error);
  const set = <K extends keyof HomeDto>(k: K, v: HomeDto[K]) => setF({ ...f, [k]: v });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit} className="card space-y-5 p-5">
      <h2 className="font-semibold">Home page</h2>
      <fieldset disabled={!canSave} className="space-y-5">
        <Field label="Eyebrow" hint="Small text above the headline" error={errs.eyebrow}><input className="input" value={f.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
        <Field label="Headline" error={errs.heroTitle}><input className="input" value={f.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} /></Field>
        <Field label="Introduction" error={errs.heroSubtitle}><textarea className="input min-h-20" value={f.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latest posts heading" error={errs.latestTitle}><input className="input" value={f.latestTitle} onChange={(e) => set('latestTitle', e.target.value)} /></Field>
          <Field label="Topics heading" error={errs.topicsTitle}><input className="input" value={f.topicsTitle} onChange={(e) => set('topicsTitle', e.target.value)} /></Field>
        </div>
      </fieldset>
      <ErrorBox error={Object.keys(errs).length ? null : save.error} />
      {save.isSuccess && <Notice tone="success">Saved.</Notice>}
      {canSave && <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={save.isPending}>Save home page</button></div>}
    </form>
  );
}

/** The site's own settings and home page texts (e-mail behaviour is under Settings). */
export function SitePage() {
  const { isAdmin } = useAuth();
  const site = useQuery({ queryKey: ['site'], queryFn: () => ContentService.contentControllerGetSite() });
  const home = useQuery({ queryKey: ['home'], queryFn: () => ContentService.contentControllerGetHome() });
  return (
    <>
      <PageHeader title="Site" subtitle="The blog's name, navigation, share buttons and home page. Changes show on the site within seconds." />
      {!isAdmin && <div className="mb-4"><Notice>Only admins can change these.</Notice></div>}
      <ErrorBox error={site.error || home.error} />
      {(site.isLoading || home.isLoading) && <Spinner />}
      <div className="grid max-w-5xl gap-6 xl:grid-cols-[3fr_2fr]">
        {site.data && <SiteForm initial={site.data} canSave={isAdmin} />}
        {home.data && <div><HomeForm initial={home.data} canSave={isAdmin} /></div>}
      </div>
    </>
  );
}

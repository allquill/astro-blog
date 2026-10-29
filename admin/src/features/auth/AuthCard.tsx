import type { ReactNode } from 'react';

/** Centered card for the signed-out pages (login, invite). */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-8" />
          <div>
            <p className="text-xs text-slate-500">Astro Blog admin</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

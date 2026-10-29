import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsService, type SettingsDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { Checkbox, ErrorBox, Field, Notice, PageHeader, Spinner, StringListEditor } from '@/shared/ui';

function SettingsForm({ initial, canSave }: { initial: SettingsDto; canSave: boolean }) {
  const qc = useQueryClient();
  const [f, setF] = useState(initial);
  const save = useMutation({
    mutationFn: () => SettingsService.settingsControllerUpdate({ requestBody: f }),
    onSuccess: (s) => qc.setQueryData(['settings'], s),
  });
  const errs = fieldErrors(save.error);
  const set = <K extends keyof SettingsDto>(k: K, v: SettingsDto[K]) => setF({ ...f, [k]: v });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-5 p-5">
      <fieldset disabled={!canSave} className="space-y-5">
        <Field label="Blog name" hint="Used in e-mail subjects and in the footer of every mailing-list e-mail." error={errs.blogName}>
          <input className="input" value={f.blogName} onChange={(e) => set('blogName', e.target.value)} />
        </Field>
        <Field label="Notification e-mails" hint="Who hears about new feedback (and new subscribers, when that is on)." error={errs.notifyTo}>
          <StringListEditor value={f.notifyTo} onChange={(v) => set('notifyTo', v)} placeholder="editor@example.com" />
        </Field>
        <div className="space-y-2">
          <Checkbox checked={f.notifyOnFeedback} onChange={(v) => set('notifyOnFeedback', v)} label="E-mail the notify list when feedback with a message arrives" />
          <Checkbox checked={f.notifyOnSubscribe} onChange={(v) => set('notifyOnSubscribe', v)} label="E-mail the notify list when someone confirms a subscription" />
          <Checkbox checked={f.acknowledgeFeedback} onChange={(v) => set('acknowledgeFeedback', v)} label="Thank readers who leave an e-mail address with their feedback" />
          <Checkbox checked={f.sendWelcome} onChange={(v) => set('sendWelcome', v)} label="Send a welcome e-mail once a subscription is confirmed" />
        </div>
        <Field label="Signature" hint="Appended to every e-mail to readers." error={errs.signature}>
          <textarea className="input min-h-20" value={f.signature} onChange={(e) => set('signature', e.target.value)} />
        </Field>
        <Field label="Mailing-list footer" hint="Shown above the unsubscribe link, e.g. your postal address (anti-spam laws ask for one)." error={errs.digestFooter}>
          <textarea className="input min-h-20" value={f.digestFooter} onChange={(e) => set('digestFooter', e.target.value)} />
        </Field>
      </fieldset>
      <ErrorBox error={save.error} />
      {save.isSuccess && <Notice tone="success">Saved.</Notice>}
      {canSave && (
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={save.isPending}>Save settings</button>
        </div>
      )}
    </form>
  );
}

export function SettingsPage() {
  const { isAdmin } = useAuth();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => SettingsService.settingsControllerGet() });
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="E-mail behaviour. The site's look, navigation and share buttons are edited in Keystatic (Settings)."
      />
      {!isAdmin && <div className="mb-4"><Notice>Only admins can change settings.</Notice></div>}
      <ErrorBox error={settings.error} />
      {settings.isLoading && <Spinner />}
      {settings.data && <SettingsForm initial={settings.data} canSave={isAdmin} />}
    </>
  );
}

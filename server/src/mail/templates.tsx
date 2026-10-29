// The HTML e-mails, rendered to static markup. Many mail clients strip <style> blocks, so styles stay inline;
// the plain-text alternatives live next to each send in mail.service.ts.
import { createElement, type CSSProperties, type FunctionComponent, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export type Field = { label: string; value: string };

/** The HTML body of one of the e-mails below, e.g. renderEmail(Invite, { … }). */
export const renderEmail = <P extends object>(Email: FunctionComponent<P>, props: P) => renderToStaticMarkup(createElement(Email, props));

const MUTED = '#64748b';
const BRAND = '#0f766e';
const button: CSSProperties = {
  display: 'inline-block', background: BRAND, color: '#fff', textDecoration: 'none', padding: '10px 18px', borderRadius: 999, fontWeight: 600,
};

function Body({ lineHeight = 1.6, children }: { lineHeight?: number; children: ReactNode }) {
  return <div style={{ font: `14px/${lineHeight} system-ui,-apple-system,Segoe UI,sans-serif`, color: '#0f172a', maxWidth: 640 }}>{children}</div>;
}

function FieldTable({ fields }: { fields: Field[] }) {
  const label: CSSProperties = { color: MUTED, verticalAlign: 'top', whiteSpace: 'nowrap' };
  return (
    <table cellPadding={6} style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {fields.map((f) => (
          <tr key={f.label}>
            <td style={label}>{f.label}</td>
            <td style={{ whiteSpace: 'pre-wrap' }}>{f.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Quote({ children }: { children: ReactNode }) {
  return <div style={{ borderLeft: `3px solid ${BRAND}`, padding: '4px 12px', margin: '12px 0', whiteSpace: 'pre-wrap' }}>{children}</div>;
}

/** Staff notice: a reader's feedback, or a new subscriber. */
export function StaffNotice({ headline, fields, body, adminUrl }: { headline: string; fields: Field[]; body?: string; adminUrl: string }) {
  return (
    <Body lineHeight={1.5}>
      <p>{headline}</p>
      <FieldTable fields={fields} />
      {body && <Quote>{body}</Quote>}
      <p><a href={adminUrl} style={button}>Open in admin</a></p>
    </Body>
  );
}

/** The post a digest announces: image, title, summary and a button. */
export type DigestPost = { title: string; url: string; summary: string; image: string | null; author: string; topics: string[] };

/** New-post e-mail to a subscriber. */
export function DigestEmail(p: { blog: string; intro: string; post: DigestPost; manageUrl: string; footer: string; signature: string }) {
  return (
    <Body>
      <p style={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{p.blog}</p>
      {p.intro && <p style={{ whiteSpace: 'pre-wrap' }}>{p.intro}</p>}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', margin: '16px 0' }}>
        {p.post.image && <a href={p.post.url}><img src={p.post.image} alt="" width={640} style={{ display: 'block', width: '100%', height: 'auto' }} /></a>}
        <div style={{ padding: '16px 20px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, lineHeight: 1.3 }}><a href={p.post.url} style={{ color: '#0f172a', textDecoration: 'none' }}>{p.post.title}</a></h2>
          {p.post.author && <p style={{ margin: '0 0 8px', color: MUTED }}>{`by ${p.post.author}`}</p>}
          {p.post.summary && <p style={{ margin: '0 0 16px' }}>{p.post.summary}</p>}
          <a href={p.post.url} style={button}>Read the post</a>
        </div>
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{p.signature}</p>
      <ListFooter manageUrl={p.manageUrl} footer={p.footer} blog={p.blog} />
    </Body>
  );
}

/** Why the reader gets this, and how to stop: on every mailing-list e-mail. */
function ListFooter({ manageUrl, footer, blog }: { manageUrl: string; footer: string; blog: string }) {
  return (
    <p style={{ color: MUTED, fontSize: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 24 }}>
      {`You are receiving this because you subscribed to ${blog}. `}
      <a href={manageUrl} style={{ color: MUTED }}>Change topics or unsubscribe</a>
      {footer && <><br />{footer}</>}
    </p>
  );
}

/** A mailing-list notice (welcome, already subscribed) with the manage link at the bottom. */
export function ListNotice(p: { paragraphs: string[]; button?: { label: string; url: string }; signature: string; manageUrl: string; footer: string; blog: string }) {
  return (
    <Body>
      {p.paragraphs.map((t, i) => <p key={i} style={{ whiteSpace: 'pre-wrap' }}>{t}</p>)}
      {p.button && <p><a href={p.button.url} style={button}>{p.button.label}</a></p>}
      <p style={{ whiteSpace: 'pre-wrap' }}>{p.signature}</p>
      <ListFooter manageUrl={p.manageUrl} footer={p.footer} blog={p.blog} />
    </Body>
  );
}

/** A staff reply to a reader's feedback, quoting what they wrote. */
export function FeedbackReply(p: { greeting: string; body: string; original: string; about: string; signature: string }) {
  return (
    <Body>
      <p>{p.greeting}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{p.body}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{p.signature}</p>
      <p style={{ color: MUTED, marginTop: 24 }}>{`You wrote${p.about ? ` about "${p.about}"` : ''}:`}</p>
      <Quote>{p.original}</Quote>
    </Body>
  );
}

/** Invite or password-reset link for a staff user. */
export function Invite({ intro, link, action, hours }: { intro: string; link: string; action: string; hours: number }) {
  return (
    <Body>
      <p>{intro}</p>
      <p><a href={link} style={button}>{action}</a></p>
      <p style={{ color: MUTED }}>{`The link works once and expires in ${hours} hours. If the button doesn't work, copy this address into your browser:`}<br />{link}</p>
      <p style={{ color: MUTED }}>If you weren't expecting this, you can ignore this e-mail.</p>
    </Body>
  );
}

/** A short notice with an optional button: confirm links and feedback acknowledgements use it. */
export function Notice(p: { greeting?: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string; signature?: string }) {
  return (
    <Body>
      {p.greeting && <p>{p.greeting}</p>}
      {p.paragraphs.map((t, i) => <p key={i} style={{ whiteSpace: 'pre-wrap' }}>{t}</p>)}
      {p.button && <p><a href={p.button.url} style={button}>{p.button.label}</a></p>}
      {p.footnote && <p style={{ color: MUTED }}>{p.footnote}</p>}
      {p.signature && <p style={{ whiteSpace: 'pre-wrap' }}>{p.signature}</p>}
    </Body>
  );
}

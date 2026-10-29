import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { AppConfig } from '../config/app-config.service';
import { oneLine } from '../common/security';
import type { Digest } from '../digests/digest.entities';
import type { FeedPost } from '../feed/site-feed.service';
import type { Feedback } from '../feedback/feedback.entity';
import type { SettingsDto } from '../settings/settings.dto';
import type { Subscriber } from '../subscribers/subscriber.entity';
import { DigestEmail, FeedbackReply, type Field, Invite, ListNotice, Notice, renderEmail, StaffNotice } from './templates';

type Reader = Pick<Subscriber, 'email' | 'name'>;

/** Every e-mail the blog sends. Callers decide whether a failure matters (they log or report it). */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');

  constructor(
    private readonly mailer: MailerService,
    private readonly config: AppConfig,
  ) {}

  private site(path: string) {
    return new URL(path, this.config.get('PUBLIC_SITE_URL')).toString();
  }

  private admin(path: string) {
    return new URL(path, this.config.get('ADMIN_URL')).toString();
  }

  private replyTo(s: SettingsDto) {
    return this.config.get('MAIL_REPLY_TO') || s.notifyTo[0] || undefined;
  }

  private address(r: Reader) {
    return r.name ? { name: oneLine(r.name), address: r.email } : r.email;
  }

  manageUrl(token: string) {
    return this.site(`/subscribe/manage/?token=${encodeURIComponent(token)}`);
  }

  /** RFC 2369 / 8058 headers: mail clients show an "Unsubscribe" button that POSTs to the API. */
  private listHeaders(token: string | null): Record<string, string> {
    if (!token) return {};
    return {
      'List-Unsubscribe': `<${this.site(`/api/public/unsubscribe?token=${encodeURIComponent(token)}`)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  // ------------------------------------------------------------------------- subscribers

  async confirmSubscription(s: Reader, token: string, st: SettingsDto) {
    const url = this.site(`/subscribe/confirm/?token=${encodeURIComponent(token)}`);
    const p = {
      greeting: s.name ? `Hi ${s.name},` : 'Hi,',
      paragraphs: [`Please confirm that you want to receive new posts from ${st.blogName} at this address.`],
      button: { label: 'Confirm my subscription', url },
      footnote: "If you didn't sign up, ignore this e-mail and you won't hear from us again.",
      signature: st.signature,
    };
    await this.mailer.sendMail({
      to: this.address(s),
      replyTo: this.replyTo(st),
      subject: oneLine(`Confirm your subscription to ${st.blogName}`),
      html: renderEmail(Notice, p),
      text: `${p.greeting}\n\n${p.paragraphs[0]}\n\nConfirm here: ${url}\n\n${p.footnote}\n\n${st.signature}`,
    });
  }

  /** Someone used the form with an address that is already subscribed: send its manage link instead. */
  async alreadySubscribed(s: Reader, manageToken: string, st: SettingsDto) {
    const manageUrl = this.manageUrl(manageToken);
    const paragraphs = [`${s.name ? `Hi ${s.name}, you're` : "You're"} already subscribed to ${st.blogName}, so there is nothing more to do.`, 'You can change which topics you get, or unsubscribe, here:'];
    await this.mailer.sendMail({
      to: this.address(s),
      replyTo: this.replyTo(st),
      subject: oneLine(`You're already subscribed to ${st.blogName}`),
      html: renderEmail(ListNotice, { paragraphs, button: { label: 'Manage my subscription', url: manageUrl }, signature: st.signature, manageUrl, footer: st.digestFooter, blog: st.blogName }),
      text: `${paragraphs.join('\n\n')}\n${manageUrl}\n\n${st.signature}`,
      headers: this.listHeaders(manageToken),
    });
  }

  async welcome(s: Reader, manageToken: string, st: SettingsDto) {
    const manageUrl = this.manageUrl(manageToken);
    const paragraphs = [
      `${s.name ? `Hi ${s.name}, thanks` : 'Thanks'} for subscribing to ${st.blogName}! You'll get an e-mail when a new post goes up.`,
      'Choose the topics you want, or unsubscribe, at any time from the link at the bottom of every e-mail.',
    ];
    await this.mailer.sendMail({
      to: this.address(s),
      replyTo: this.replyTo(st),
      subject: oneLine(`Welcome to ${st.blogName}`),
      html: renderEmail(ListNotice, { paragraphs, button: { label: 'Visit the blog', url: this.site('/') }, signature: st.signature, manageUrl, footer: st.digestFooter, blog: st.blogName }),
      text: `${paragraphs.join('\n\n')}\n\nManage your subscription: ${manageUrl}\n\n${st.signature}`,
      headers: this.listHeaders(manageToken),
    });
  }

  async newSubscriber(s: Subscriber, to: string[], st: SettingsDto) {
    const fields: Field[] = [
      { label: 'E-mail', value: s.email },
      { label: 'Name', value: s.name },
      { label: 'Topics', value: (JSON.parse(s.topics || '[]') as string[]).join(', ') || 'All topics' },
      { label: 'Signed up on', value: s.source },
    ].filter((f) => f.value);
    const adminUrl = this.admin('/subscribers');
    await this.mailer.sendMail({
      to,
      subject: oneLine(`New subscriber to ${st.blogName}: ${s.email}`),
      html: renderEmail(StaffNotice, { headline: 'A new subscription was confirmed.', fields, adminUrl }),
      text: `A new subscription was confirmed.\n\n${fields.map((f) => `${f.label}: ${f.value}`).join('\n')}\n\nOpen in admin: ${adminUrl}`,
    });
  }

  // ---------------------------------------------------------------------------- feedback

  async newFeedback(f: Feedback, post: FeedPost | null, to: string[], st: SettingsDto) {
    const fields: Field[] = [
      { label: 'About', value: post ? `${post.title} (${post.url})` : f.postSlug ?? 'The blog in general' },
      { label: 'Helpful?', value: f.helpful === null ? '' : f.helpful ? 'Yes' : 'No' },
      { label: 'Name', value: f.name },
      { label: 'E-mail', value: f.email },
    ].filter((x) => x.value);
    const adminUrl = this.admin(`/feedback/${f.id}`);
    await this.mailer.sendMail({
      to,
      replyTo: f.email ? this.address({ email: f.email, name: f.name }) : undefined,
      subject: oneLine(`Feedback on ${post?.title ?? st.blogName}${f.name ? ` from ${f.name}` : ''}`),
      html: renderEmail(StaffNotice, { headline: 'New feedback from a reader.', fields, body: f.message, adminUrl }),
      text: `New feedback from a reader.\n\n${fields.map((x) => `${x.label}: ${x.value}`).join('\n')}\n\n${f.message}\n\nOpen in admin: ${adminUrl}`,
    });
  }

  async acknowledgeFeedback(f: Feedback, post: FeedPost | null, st: SettingsDto) {
    const p = {
      greeting: f.name ? `Hi ${f.name},` : 'Hi,',
      paragraphs: [`Thanks for your feedback${post ? ` on "${post.title}"` : ''}. We read every message, and will reply if you asked us something.`],
      signature: st.signature,
    };
    await this.mailer.sendMail({
      to: this.address({ email: f.email, name: f.name }),
      replyTo: this.replyTo(st),
      subject: oneLine(`Thanks for your feedback — ${st.blogName}`),
      html: renderEmail(Notice, p),
      text: `${p.greeting}\n\n${p.paragraphs[0]}\n\n${st.signature}`,
    });
  }

  async feedbackReply(f: Feedback, post: FeedPost | null, body: string, st: SettingsDto) {
    const greeting = f.name ? `Hi ${f.name},` : 'Hi,';
    await this.mailer.sendMail({
      to: this.address({ email: f.email, name: f.name }),
      replyTo: this.replyTo(st),
      subject: oneLine(`Re: your feedback${post ? ` on "${post.title}"` : ''} — ${st.blogName}`),
      html: renderEmail(FeedbackReply, { greeting, body, original: f.message, about: post?.title ?? '', signature: st.signature }),
      text: `${greeting}\n\n${body}\n\n${st.signature}\n\n> ${f.message.split('\n').join('\n> ')}`,
    });
  }

  // ----------------------------------------------------------------------------- digests

  /** `manageToken` null = a test copy (the unsubscribe link goes to the subscribe page). */
  renderDigest(d: Pick<Digest, 'intro'>, post: FeedPost, manageToken: string | null, st: SettingsDto) {
    const manageUrl = manageToken ? this.manageUrl(manageToken) : this.site('/subscribe/');
    const html = renderEmail(DigestEmail, { blog: st.blogName, intro: d.intro, post, manageUrl, footer: st.digestFooter, signature: st.signature });
    const text = [
      st.blogName.toUpperCase(),
      d.intro,
      `${post.title}${post.author ? `\nby ${post.author}` : ''}`,
      post.summary,
      `Read the post: ${post.url}`,
      st.signature,
      `--\nYou are receiving this because you subscribed to ${st.blogName}.\nChange topics or unsubscribe: ${manageUrl}${st.digestFooter ? `\n${st.digestFooter}` : ''}`,
    ].filter(Boolean).join('\n\n');
    return { html, text };
  }

  async sendDigest(to: Reader, d: Pick<Digest, 'intro' | 'subject'>, post: FeedPost, manageToken: string | null, st: SettingsDto) {
    const { html, text } = this.renderDigest(d, post, manageToken, st);
    await this.mailer.sendMail({
      to: this.address(to),
      replyTo: this.replyTo(st),
      subject: oneLine(manageToken ? d.subject : `[TEST] ${d.subject}`),
      html,
      text,
      headers: { ...this.listHeaders(manageToken), Precedence: 'bulk' },
    });
  }

  // ------------------------------------------------------------------------------- staff

  /** Invite (new user) or password-reset link for a staff user. */
  async sendInvite(to: { username: string; email: string }, link: string, kind: 'invite' | 'reset', invitedBy: string) {
    const invite = kind === 'invite';
    const app = `${this.config.get('BLOG_NAME')} admin`;
    const subject = invite ? `You've been invited to the ${app}` : `Reset your ${app} password`;
    const intro = invite
      ? `${invitedBy} has invited you to the ${app}, where subscribers, feedback and new-post e-mails are managed. Your username is "${to.username}".`
      : `${invitedBy} has sent you a link to set a new password for the ${app} (username "${to.username}").`;
    const action = invite ? 'Set your password' : 'Choose a new password';
    await this.mailer.sendMail({
      to: { name: oneLine(to.username), address: to.email },
      subject,
      html: renderEmail(Invite, { intro, link, action, hours: 48 }),
      text: `${intro}\n\n${action} here (the link works once and expires in 48 hours):\n${link}\n\nIf you weren't expecting this, you can ignore this e-mail.`,
    });
  }

  /** Logged at start-up only; subscriptions and feedback are stored even if SMTP is down. */
  async verify() {
    const host = `${this.config.get('SMTP_HOST')}:${this.config.get('SMTP_PORT')}`;
    try {
      if (!(await this.mailer.verifyAllTransporters())) throw new Error('verification failed');
      this.logger.log(`SMTP ${host} reachable`);
    } catch (e) {
      this.logger.warn(`SMTP check failed for ${host} (${(e as Error).message}); subscriptions and feedback are still stored`);
    }
  }
}

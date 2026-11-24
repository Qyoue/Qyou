import { readFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';
import { env, type Env } from '../../../shared/config/env.js';

export type AuthEmailTemplate = 'email-verification' | 'password-reset';

export interface AuthEmail {
  to: string;
  subject: string;
  template: AuthEmailTemplate;
  variables: { url: string };
}

export interface Mailer {
  send(email: AuthEmail): Promise<void>;
}

export async function renderAuthEmail(
  template: AuthEmailTemplate,
  variables: AuthEmail['variables'],
) {
  const [html, text] = await Promise.all([
    readFile(new URL(`../../../../templates/${template}.html`, import.meta.url), 'utf8'),
    readFile(new URL(`../../../../templates/${template}.txt`, import.meta.url), 'utf8'),
  ]);
  const render = (content: string) =>
    content.replace(
      /\{\{(\w+)\}\}/g,
      (_match, key: string) => variables[key as keyof typeof variables] ?? '',
    );
  return { html: render(html), text: render(text) };
}

export class ConsoleMailer implements Mailer {
  async send(email: AuthEmail): Promise<void> {
    const content = await renderAuthEmail(email.template, email.variables);
    console.info(`[mail:console] to=${email.to} subject=${email.subject}\n${content.text}`);
  }
}

export class SmtpMailer implements Mailer {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly from: string,
    config: Pick<Env, 'SMTP_HOST' | 'SMTP_PORT' | 'SMTP_SECURE' | 'SMTP_USER' | 'SMTP_PASSWORD'>,
  ) {
    if (!config.SMTP_HOST) throw new Error('SMTP_HOST is required when SMTP mail is enabled.');
    if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD)) {
      throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together.');
    }
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      ...(config.SMTP_USER && config.SMTP_PASSWORD
        ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } }
        : {}),
    });
  }

  async send(email: AuthEmail): Promise<void> {
    const content = await renderAuthEmail(email.template, email.variables);
    await this.transporter.sendMail({
      from: this.from,
      to: email.to,
      subject: email.subject,
      text: content.text,
      html: content.html,
    });
  }
}

export function createMailer(config: Env = env): Mailer {
  if (config.MAILER_MODE === 'console') {
    if (config.NODE_ENV === 'production') {
      throw new Error('Console mail is only available outside production.');
    }
    return new ConsoleMailer();
  }
  if (config.MAILER_MODE === 'smtp' || (config.MAILER_MODE === 'auto' && config.SMTP_HOST)) {
    if (!config.SMTP_FROM) throw new Error('SMTP_FROM is required when SMTP mail is enabled.');
    return new SmtpMailer(config.SMTP_FROM, config);
  }
  if (config.NODE_ENV === 'production') {
    throw new Error('Configure SMTP_HOST and SMTP_FROM to enable email delivery in production.');
  }
  return new ConsoleMailer();
}

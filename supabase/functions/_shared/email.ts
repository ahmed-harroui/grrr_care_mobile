// Every email of the ecosystem wears the same layout: the brand, a coloured banner with the subject, a white
// card, one button at most, a footer. Only the colours change with the product it comes from:
// blue for GRRR Care and its partners, pink for the GRRRR store. emails/partner-invite.html is the same design,
// written by hand because it is sent from a script.
// Tables and inline styles only: that is what mail clients render reliably.

export type Brand = 'care' | 'store';

const BRANDS = {
  care: {
    page: '#EEF2F7',
    primary: '#2563EB',
    soft: '#DBEAFE',
    onPrimarySoft: '#BFDBFE',
    panel: '#F3F6FB',
    name: '<span style="color:#1A1A1A;">GRRR Care</span>',
    footer: 'GRRR Care est édité par Great Rascals · contact@greatrascals.com',
  },
  store: {
    page: '#FFF8F2',
    primary: '#F43F5E',
    soft: '#FFE4EB',
    onPrimarySoft: '#FFD5DE',
    panel: '#FFF0F3',
    name: '<span style="color:#292929;letter-spacing:-1px;">G</span><span style="color:#F43F5E;letter-spacing:-1px;">RRRR</span>',
    footer: 'La boutique GRRRR est éditée par Great Rascals · contact@greatrascals.com',
  },
} as const;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const escapeHtml = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A paragraph of the card. The html is trusted: escape what comes from people with escapeHtml. */
export const paragraph = (html: string) => `<p style="margin:0 0 16px;">${html}</p>`;

/** The tinted box that shows what the email is about: a listing, a product, an order, an address. */
export function panel(brand: Brand, label: string, html: string) {
  const b = BRANDS[brand];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr>
<td style="background:${b.panel};border-left:4px solid ${b.primary};border-radius:0 12px 12px 0;padding:14px 16px;font-size:15px;line-height:1.55;">
<div style="font-size:12px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${escapeHtml(label)}</div>
${html}
</td></tr></table>`;
}

export interface EmailContent {
  brand: Brand;
  /** Small line above the title, e.g. "Commande confirmée" */
  kicker: string;
  title: string;
  /** Card content: paragraph() and panel() pieces */
  body: string;
  button?: { label: string; url: string };
  /** Small grey line under the button */
  hint?: string;
  /** Who signs, e.g. "L'équipe GRRR Care"; none for the emails sent to the admin */
  signature?: string;
  /** Extra line of the footer: why the person receives this */
  footnote?: string;
}

export function emailLayout({ brand, kicker, title, body, button, hint, signature, footnote }: EmailContent) {
  const b = BRANDS[brand];
  const action = button
    ? `<tr><td align="center" style="background:#FFFFFF;padding:6px 32px 10px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:${b.primary};border-radius:14px;">
<a href="${button.url}" style="display:inline-block;padding:16px 30px;font-size:16px;font-weight:800;color:#FFFFFF;text-decoration:none;">${escapeHtml(button.label)}&nbsp;→</a>
</td></tr></table>
${hint ? `<div style="font-size:13px;color:#666666;margin-top:12px;line-height:1.5;">${hint}</div>` : ''}
</td></tr>`
    : '';
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${b.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.page};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;font-family:${FONT};color:#1A1A1A;">
<tr><td style="padding:0 4px 18px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:44px;height:44px;background:${b.primary};border-radius:13px;text-align:center;font-size:22px;line-height:44px;">🐾</td>
<td style="padding-left:12px;font-size:21px;font-weight:900;">${b.name}</td>
</tr></table>
</td></tr>
<tr><td style="background:${b.primary};border-radius:20px 20px 0 0;padding:30px 32px 26px;">
<div style="font-size:13px;font-weight:700;letter-spacing:1px;color:${b.onPrimarySoft};text-transform:uppercase;">${escapeHtml(kicker)}</div>
<div style="font-size:25px;line-height:1.25;font-weight:800;color:#FFFFFF;margin-top:8px;">${escapeHtml(title)}</div>
</td></tr>
<tr><td style="background:#FFFFFF;padding:28px 32px 8px;font-size:16px;line-height:1.6;">${body}</td></tr>
${action}
<tr><td style="background:#FFFFFF;border-radius:0 0 20px 20px;padding:14px 32px 28px;font-size:15px;line-height:1.6;">${
    signature ? `<p style="margin:0;">À très vite,<br><b>${escapeHtml(signature)}</b></p>` : ''
  }</td></tr>
<tr><td style="padding:20px 12px 0;font-size:12px;line-height:1.6;color:#6B7280;text-align:center;">${footnote ? `${footnote}<br>` : ''}${b.footer}</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

const SENDERS: Record<Brand, string> = { care: 'GRRR Care', store: 'GRRRR' };

/**
 * Sends one email through Resend, in the shared layout. Secrets: RESEND_API_KEY; EMAIL_FROM, an address on the
 * domain verified in Resend (a "Name <address>" form works too: the name shown is the brand's anyway);
 * REPLY_TO, where answers go (the sending domain receives no mail), else ADMIN_EMAIL.
 */
export async function sendEmail(to: string, subject: string, content: EmailContent) {
  const address = (Deno.env.get('EMAIL_FROM') ?? '').replace(/^.*<|>.*$/g, '').trim();
  const replyTo = Deno.env.get('REPLY_TO') ?? Deno.env.get('ADMIN_EMAIL');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${SENDERS[content.brand]} <${address}>`,
      to,
      subject,
      html: emailLayout(content),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

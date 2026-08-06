import { EMAIL_BRAND } from '@/lib/notifications/email-brand';

export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 16px;color:${EMAIL_BRAND.text};font-size:16px;line-height:26px;">${html}</p>`;
}

export function emailSectionHeading(title: string): string {
  return `<p style="margin:28px 0 10px;color:${EMAIL_BRAND.heading};font-size:15px;font-weight:700;letter-spacing:0.02em;">${title}</p>`;
}

export function emailBulletList(items: string[]): string {
  const lis = items
    .map(
      (item) =>
        `<li style="margin-bottom:10px;color:${EMAIL_BRAND.text};font-size:15px;line-height:24px;">${item}</li>`
    )
    .join('');
  return `<ul style="padding-left:20px;margin:0 0 16px;">${lis}</ul>`;
}

export function emailOrderedList(items: string[]): string {
  const lis = items
    .map(
      (item) =>
        `<li style="margin-bottom:10px;color:${EMAIL_BRAND.text};font-size:15px;line-height:24px;">${item}</li>`
    )
    .join('');
  return `<ol style="padding-left:20px;margin:0 0 16px;">${lis}</ol>`;
}

export function emailHighlightBox(html: string): string {
  return `<div style="margin:16px 0;padding:16px 18px;border:1px solid ${EMAIL_BRAND.accentSoftBorder};border-radius:12px;background:${EMAIL_BRAND.accentSoftBg};">${html}</div>`;
}

export function wrapProductEmailHtml(params: {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerHtml?: string;
}): string {
  const ctaBlock =
    params.ctaLabel && params.ctaUrl
      ? `<tr>
        <td align="center" style="padding: 8px 0 8px;">
          <a href="${params.ctaUrl}" style="display:inline-block;background-color:${EMAIL_BRAND.accent};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;line-height:16px;padding:16px 32px;border-radius:10px;border:1px solid ${EMAIL_BRAND.accentHover};">${params.ctaLabel}</a>
        </td>
      </tr>`
      : '';

  const footerBlock =
    params.footerHtml === ''
      ? ''
      : `<tr>
            <td style="color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:20px;padding-top:20px;border-top:1px solid ${EMAIL_BRAND.cardBorder};">
              ${params.footerHtml ?? 'You received this because you have an Auro account. Manage notifications in your account settings.'}
            </td>
          </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:${EMAIL_BRAND.pageBg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background-color:${EMAIL_BRAND.pageBg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:separate;background-color:${EMAIL_BRAND.cardBg};border:1px solid ${EMAIL_BRAND.cardBorder};border-radius:16px;padding:36px 32px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="display:inline-block;padding-bottom:10px;border-bottom:3px solid ${EMAIL_BRAND.accent};">
                <span style="color:${EMAIL_BRAND.heading};font-size:28px;font-weight:800;letter-spacing:-0.02em;">Auro</span>
              </div>
              <h1 style="color:${EMAIL_BRAND.heading};font-size:22px;font-weight:700;line-height:28px;margin:18px 0 0;">${params.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="color:${EMAIL_BRAND.text};font-size:16px;line-height:26px;">
              ${params.bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          ${footerBlock}
        </table>
        <p style="margin:20px 0 0;color:${EMAIL_BRAND.textMuted};font-size:12px;line-height:18px;text-align:center;">Auro · Honest feedback from real reviewers</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

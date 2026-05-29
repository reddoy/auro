export function wrapProductEmailHtml(params: {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const ctaBlock =
    params.ctaLabel && params.ctaUrl
      ? `<tr>
        <td align="center" style="padding: 8px 0 32px;">
          <a href="${params.ctaUrl}" style="display: inline-block; background-color: #FF6B35; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 28px; border-radius: 8px;">${params.ctaLabel}</a>
        </td>
      </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0C0225;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#0C0225;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width:600px;width:100%;background-color:#0C0225;border-radius:16px;padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="color:#FFFFFF;font-size:28px;font-weight:700;">Auro</span>
              <h1 style="color:#FFFFFF;font-size:24px;font-weight:700;margin:16px 0 0;">${params.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="color:#C7BFD9;font-size:16px;line-height:24px;padding-bottom:24px;">
              ${params.bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="color:#8B7FA8;font-size:13px;line-height:20px;padding-top:16px;border-top:1px solid #2A1F45;">
              You received this because you have an Auro account. Manage notifications in your account settings.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

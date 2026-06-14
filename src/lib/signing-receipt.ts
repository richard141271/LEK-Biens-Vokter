export type SigningReceiptPayload = {
  title: string;
  description?: string | null;
  token: string;
  recipientName: string;
  recipientEmail?: string | null;
  recipientSignedAt?: string | null;
  recipientSignatureName?: string | null;
  senderName: string;
  senderSignedAt?: string | null;
  senderSignatureName?: string | null;
  generatedAt: string;
  publicCompletedUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTs(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('nb-NO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function generateSigningReceiptHtml(payload: SigningReceiptPayload) {
  const title = escapeHtml(payload.title);
  const description = escapeHtml(String(payload.description || ''));
  const token = escapeHtml(payload.token);
  const recipientName = escapeHtml(payload.recipientSignatureName || payload.recipientName);
  const recipientEmail = escapeHtml(String(payload.recipientEmail || ''));
  const senderName = escapeHtml(payload.senderSignatureName || payload.senderName);
  const recipientSignedAt = escapeHtml(formatTs(payload.recipientSignedAt));
  const senderSignedAt = escapeHtml(formatTs(payload.senderSignedAt));
  const generatedAt = escapeHtml(formatTs(payload.generatedAt));
  const completedUrl = escapeHtml(payload.publicCompletedUrl);

  return `<!doctype html>
<html lang="nb">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signeringskvittering</title>
    <style>
      :root { --fg:#111827; --muted:#6b7280; --border:#e5e7eb; --bg:#f9fafb; --brand:#111827; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:var(--fg); background:var(--bg); }
      .page { padding: 28px; }
      .card { background:#fff; border:1px solid var(--border); border-radius: 18px; padding: 22px; }
      .top { display:flex; justify-content:space-between; gap: 16px; align-items:flex-start; }
      .badge { display:inline-flex; gap:8px; align-items:center; font-weight:800; font-size: 12px; letter-spacing:.02em; padding: 6px 10px; border-radius:999px; border:1px solid var(--border); background:#f3f4f6; }
      h1 { margin: 10px 0 0; font-size: 22px; line-height: 1.2; }
      .muted { color: var(--muted); font-size: 12px; }
      .section { margin-top: 18px; border-top:1px solid #f3f4f6; padding-top: 16px; }
      .label { font-size: 11px; font-weight: 900; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
      .value { margin-top: 6px; font-size: 14px; }
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
      .box { border:1px solid var(--border); border-radius: 14px; padding: 14px; background:#f9fafb; }
      .row { display:flex; justify-content:space-between; gap: 12px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace; }
      .link { word-break: break-all; }
      .small { font-size: 11px; }
      .footer { margin-top: 16px; color: var(--muted); font-size: 11px; line-height: 1.4; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="card">
        <div class="top">
          <div>
            <div class="badge">LEK-Signering • Signeringskvittering</div>
            <h1>${title}</h1>
            ${description ? `<div class="muted" style="margin-top:6px">${description}</div>` : ``}
          </div>
          <div class="muted" style="text-align:right">
            <div class="label">Generert</div>
            <div class="value">${generatedAt}</div>
          </div>
        </div>

        <div class="section">
          <div class="grid">
            <div class="box">
              <div class="label">Mottaker</div>
              <div class="value"><strong>${recipientName}</strong></div>
              ${recipientEmail ? `<div class="muted">${recipientEmail}</div>` : ``}
              <div class="muted small" style="margin-top:10px"><span class="label" style="text-transform:none;letter-spacing:0">Signert</span> ${recipientSignedAt}</div>
            </div>
            <div class="box">
              <div class="label">Avsender</div>
              <div class="value"><strong>${senderName}</strong></div>
              <div class="muted small" style="margin-top:10px"><span class="label" style="text-transform:none;letter-spacing:0">Signert</span> ${senderSignedAt}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="label">Referanse</div>
          <div class="value row">
            <div class="mono">${token}</div>
            <div class="muted">Status: FULLFØRT</div>
          </div>
          <div class="muted small" style="margin-top:10px">Ferdig signert dokument og kvittering kan verifiseres her:</div>
          <div class="value link mono">${completedUrl}</div>
        </div>

        <div class="footer">
          Dette er en enkel digital signeringskvittering (MVP) og er ikke BankID.
          Signaturer er bekreftet ved at partene har signert med navn og tidspunkt i LEK-Biens Vokter.
        </div>
      </div>
    </div>
  </body>
</html>`;
}


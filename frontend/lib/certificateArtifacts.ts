import { StudentCertificateRecord } from "./certificateRegistry";

const escapeHtml = (value: string | undefined): string => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const getSafeFileName = (value: string): string => {
  return value.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "") || "certificate";
};

export const buildCertificateVerificationUrl = (certificateId: string): string => {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const path = `/employer?certificateId=${encodeURIComponent(certificateId)}`;
  return origin ? `${origin}${path}` : path;
};

export const formatCertificateDate = (date: string | undefined): string => {
  if (!date) {
    return "N/A";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString();
};

export const buildCertificateHtml = (certificate: StudentCertificateRecord): string => {
  const verificationUrl = buildCertificateVerificationUrl(certificate.certificateId);
  const status = certificate.revoked ? "Revoked" : "Valid";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(certificate.certificateId)} Certificate</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #eef2f7;
        color: #111827;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .sheet {
        width: min(1000px, calc(100vw - 32px));
        aspect-ratio: 1.414 / 1;
        padding: 56px;
        background: linear-gradient(135deg, #334155, #111827);
        color: #fff;
        border: 12px solid rgba(255, 255, 255, 0.24);
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .center { text-align: center; }
      .eyebrow { letter-spacing: 0.12em; text-transform: uppercase; font-size: 12px; opacity: 0.75; }
      h1 { margin: 12px 0 8px; font-size: 38px; font-weight: 700; }
      h2 { margin: 0; font-size: 32px; font-weight: 600; }
      .recipient { margin: 24px auto; padding: 16px 48px; border-bottom: 2px solid rgba(255, 255, 255, 0.45); width: fit-content; min-width: 50%; }
      .details {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-top: 28px;
        font-size: 13px;
      }
      .detail { padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.25); }
      .label { opacity: 0.7; display: block; margin-bottom: 4px; }
      .hash { overflow-wrap: anywhere; }
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 24px;
        font-size: 13px;
      }
      .verify { max-width: 55%; overflow-wrap: anywhere; opacity: 0.85; }
      @media print {
        body { background: #fff; }
        .sheet { width: 100vw; box-shadow: none; border-color: rgba(255, 255, 255, 0.35); }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="center">
        <div class="eyebrow">Blockchain Verified Certificate</div>
        <h1>${escapeHtml(certificate.certificateType)}</h1>
        <p>${escapeHtml(certificate.department || "Academic Certificate")}</p>
      </section>

      <section class="center">
        <p>This is to certify that</p>
        <div class="recipient">
          <h2>${escapeHtml(certificate.studentName)}</h2>
        </div>
        <p>${escapeHtml(certificate.description || certificate.grade || "has successfully completed the requirements")}</p>
      </section>

      <section class="details">
        <div class="detail">
          <span class="label">Certificate ID</span>
          ${escapeHtml(certificate.certificateId)}
        </div>
        <div class="detail">
          <span class="label">Issue Date</span>
          ${escapeHtml(formatCertificateDate(certificate.issueDate))}
        </div>
        <div class="detail">
          <span class="label">Status</span>
          ${escapeHtml(status)}
        </div>
      </section>

      <section class="footer">
        <div>
          <span class="label">Student Wallet</span>
          <span class="hash">${escapeHtml(certificate.studentWalletAddress)}</span>
        </div>
        <div class="verify">
          <span class="label">Verify</span>
          ${escapeHtml(verificationUrl)}
        </div>
      </section>
    </main>
  </body>
</html>`;
};

export const openCertificatePrintView = (certificate: StudentCertificateRecord): void => {
  const popup = window.open("about:blank", "_blank");
  if (!popup) {
    throw new Error("Popup blocked. Allow popups to view the certificate.");
  }

  popup.opener = null;
  popup.document.open();
  popup.document.write(buildCertificateHtml(certificate));
  popup.document.close();
  popup.focus();
};

export const downloadCertificateHtml = (certificate: StudentCertificateRecord): void => {
  const blob = new Blob([buildCertificateHtml(certificate)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${getSafeFileName(certificate.certificateId)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadCsv = (fileName: string, rows: string[][]): void => {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail(to: string | string[], subject: string, html: string) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return { skipped: true };
  }
  try {
    const r = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    });
    return r;
  } catch (e: any) {
    console.error("[email] send failed", e?.message);
    return { error: e?.message };
  }
}

export function emailTemplate(opts: {
  title: string; preview?: string; bodyHtml: string; actionHref?: string; actionLabel?: string;
}) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 16px;font-size:20px;color:#111827">${opts.title}</h1>
    <div style="color:#374151;font-size:14px;line-height:1.6">${opts.bodyHtml}</div>
    ${opts.actionHref ? `<p style="margin-top:24px"><a href="${opts.actionHref}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${opts.actionLabel || "Open"}</a></p>` : ""}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="color:#6b7280;font-size:12px">PR System — automated notification</p>
  </div></body></html>`;
}

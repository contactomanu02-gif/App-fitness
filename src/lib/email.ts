import "server-only";

/** Envía un email con Resend. Devuelve false si no está configurado o falla. */
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function invitationEmail(p: { firstName: string; orgName: string; link: string }) {
  const subject = `${p.orgName} te invitó a entrenar`;
  const text = `Hola ${p.firstName}:\n\n${p.orgName} te invitó a su plataforma de entrenamiento. Creá tu contraseña en este enlace:\n${p.link}\n\nEl enlace vence en 14 días.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0c110e">
  <p>Hola ${esc(p.firstName)}:</p>
  <p><strong>${esc(p.orgName)}</strong> te invitó a su plataforma de entrenamiento. Ahí vas a ver tus rutinas y registrar cada sesión.</p>
  <p style="margin:28px 0"><a href="${esc(p.link)}" style="background:#0e7a4c;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Crear mi cuenta</a></p>
  <p style="color:#5d6761;font-size:13px">El enlace vence en 14 días.</p></div>`;
  return { subject, text, html };
}

export function painEmail(p: { message: string; link: string }) {
  const subject = "Un alumno reportó dolor";
  const text = `${p.message}\n\nVer la ficha: ${p.link}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0c110e">
  <p style="font-size:16px"><strong>${esc(p.message)}</strong></p>
  <p style="margin:24px 0"><a href="${esc(p.link)}" style="background:#0e7a4c;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Ver la ficha del alumno</a></p></div>`;
  return { subject, text, html };
}

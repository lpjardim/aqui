import { formatNumber } from "@/lib/format";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Sem RESEND_API_KEY o email é escrito na consola, o que mantém o
 * desenvolvimento local funcional sem configuração extra.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Aqui. <onboarding@resend.dev>";

  if (!apiKey) {
    console.info(`[email] para: ${to}\n[email] assunto: ${subject}\n${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, ...(html ? { html } : {}) }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar email: ${await response.text()}`);
  }
}

/**
 * Notificação interna (equipa Aqui.), não destinada ao cliente. Sem
 * INTERNAL_NOTIFICATIONS_EMAIL configurado, fica apenas registada na consola.
 */
export async function sendInternalNotification(subject: string, text: string): Promise<void> {
  const to = process.env.INTERNAL_NOTIFICATIONS_EMAIL;

  if (!to) {
    console.info(`[notificação interna] ${subject}\n${text}`);
    return;
  }

  await sendEmail({ to, subject: `[Aqui.] ${subject}`, text });
}

export async function sendLoginEmail(to: string, link: string): Promise<void> {
  await sendEmail({
    to,
    subject: "O seu acesso ao painel Aqui.",
    text: [
      "Olá,",
      "",
      "Use o link abaixo para entrar no seu painel. É válido durante 30 minutos.",
      "",
      link,
      "",
      "Expirou? Pedir novo link de acesso em https://aqui.network/entrar.",
      "",
      "Se não pediu este acesso, ignore este email.",
      "",
      "Aqui.",
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
        <p>Olá,</p>
        <p>Use o botão abaixo para entrar no seu painel.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${link}" target="_blank" rel="noopener noreferrer" style="background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; display: inline-block;">
            Entrar no painel
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Este link é válido durante 30 minutos.<br />
          Se expirar, pode pedir um novo em
          <a href="https://aqui.network/entrar" target="_blank" rel="noopener noreferrer" style="color: #dc2626;">aqui.network/entrar</a>.
        </p>
        <p style="color: #6b7280; font-size: 14px;">Se não pediu este acesso, ignore este email.</p>
        <p>Aqui.</p>
      </div>
    `,
  });
}

type CampaignActivatedInput = {
  companyName: string;
  zone: string;
  purchased: number;
  dashboardLink: string;
  adPreviewLink: string;
};

/** Enviado ao cliente UMA vez, quando a Order é associada com sucesso a uma campanha Meta. */
export async function sendCampaignActivatedEmail(
  to: string,
  { companyName, zone, purchased, dashboardLink, adPreviewLink }: CampaignActivatedInput,
): Promise<void> {
  await sendEmail({
    to,
    subject: "A sua campanha já está ativa — Aqui.",
    text: [
      `Olá, ${companyName},`,
      "",
      `A sua campanha em ${zone} já está a decorrer e a entregar as ${formatNumber(purchased)} visualizações que comprou.`,
      "",
      `Acompanhar campanha: ${dashboardLink}`,
      `Ver anúncio: ${adPreviewLink}`,
      "",
      "Assim que atingir o objetivo, avisamo-lo por email.",
      "",
      "Aqui.",
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
        <p>Olá, ${companyName},</p>
        <p>
          A sua campanha em <strong>${zone}</strong> já está a decorrer e a entregar as
          <strong>${formatNumber(purchased)}</strong> visualizações que comprou.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${dashboardLink}" target="_blank" rel="noopener noreferrer" style="background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; display: inline-block;">
            Acompanhar campanha
          </a>
        </p>
        <p style="text-align: center; margin: 0 0 24px;">
          <a href="${adPreviewLink}" target="_blank" rel="noopener noreferrer" style="color: #dc2626; font-size: 14px; text-decoration: underline;">
            Ver anúncio ↗
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Assim que atingir o objetivo de visualizações, avisamo-lo por email.
        </p>
        <p>Aqui.</p>
      </div>
    `,
  });
}

type CampaignCompletedInput = {
  companyName: string;
  zone: string;
  purchased: number;
  delivered: number;
  dashboardLink: string;
};

/** Enviado ao cliente UMA vez, depois de a pausa da campanha Meta ser confirmada. */
export async function sendCampaignCompletedEmail(
  to: string,
  { companyName, zone, purchased, delivered, dashboardLink }: CampaignCompletedInput,
): Promise<void> {
  await sendEmail({
    to,
    subject: "A sua campanha foi concluída — Aqui.",
    text: [
      `Olá, ${companyName},`,
      "",
      `A sua campanha em ${zone} foi concluída com sucesso.`,
      "",
      `Visualizações compradas: ${formatNumber(purchased)}`,
      `Visualizações entregues: ${formatNumber(delivered)}`,
      "",
      `Ver painel: ${dashboardLink}`,
      "",
      "O comprovativo final fica disponível no seu painel assim que preparado pela nossa equipa.",
      "",
      "Obrigado por confiar na Aqui.",
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
        <p>Olá, ${companyName},</p>
        <p>A sua campanha em <strong>${zone}</strong> foi concluída com sucesso.</p>
        <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Visualizações compradas</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formatNumber(purchased)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Visualizações entregues</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formatNumber(delivered)}</td>
          </tr>
        </table>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${dashboardLink}" target="_blank" rel="noopener noreferrer" style="background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; display: inline-block;">
            Ver painel
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          O comprovativo final fica disponível no seu painel assim que preparado pela nossa equipa.
        </p>
        <p>Obrigado por confiar na Aqui.</p>
      </div>
    `,
  });
}

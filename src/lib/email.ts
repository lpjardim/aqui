type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Sem RESEND_API_KEY o email é escrito na consola, o que mantém o
 * desenvolvimento local funcional sem configuração extra.
 */
export async function sendEmail({ to, subject, text }: SendEmailInput): Promise<void> {
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
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar email: ${await response.text()}`);
  }
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
  });
}

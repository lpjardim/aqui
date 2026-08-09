"use server";

import { prisma } from "@/lib/prisma";
import { createLoginLink } from "@/lib/auth";
import { sendLoginEmail } from "@/lib/email";

export type LoginState = { message: string | null; sent: boolean };

export async function requestLoginLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { message: "Email inválido.", sent: false };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const link = await createLoginLink(user.id);
    await sendLoginEmail(user.email, link);
  }

  // A resposta é sempre igual para não revelar que emails existem.
  return {
    message: "Se existir uma conta com esse email, enviámos um link de acesso.",
    sent: true,
  };
}

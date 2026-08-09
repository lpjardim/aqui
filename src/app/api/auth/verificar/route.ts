import { NextResponse } from "next/server";
import { consumeLoginToken, createSession } from "@/lib/auth";
import { appUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const next = url.searchParams.get("seguinte") ?? "/painel";

  if (!token) {
    return NextResponse.redirect(appUrl("/entrar?erro=1"));
  }

  const userId = await consumeLoginToken(token);

  if (!userId) {
    return NextResponse.redirect(appUrl("/entrar?erro=1"));
  }

  await createSession(userId);

  const safeNext = next.startsWith("/") ? next : "/painel";
  return NextResponse.redirect(appUrl(safeNext));
}

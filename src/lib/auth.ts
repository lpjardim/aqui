import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "aqui_sessao";
export const ADMIN_COOKIE = "aqui_admin";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const TOKEN_MAX_AGE_MS = 1000 * 60 * 30;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET não está definida.");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(value: object): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode<T>(value: string | undefined): T | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

type SessionPayload = { userId: string; exp: number };

export async function createSession(userId: string): Promise<void> {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const store = await cookies();
  store.set(SESSION_COOKIE, encode({ userId, exp } satisfies SessionPayload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const session = decode<SessionPayload>(store.get(SESSION_COOKIE)?.value);
  if (!session || session.exp < Date.now()) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

/** Devolve o URL do magic link para ser enviado por email. */
export async function createLoginLink(userId: string, redirectTo = "/painel"): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await prisma.loginToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_MAX_AGE_MS),
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/api/auth/verificar", base);
  url.searchParams.set("token", token);
  url.searchParams.set("seguinte", redirectTo);
  return url.toString();
}

export async function consumeLoginToken(token: string): Promise<string | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.loginToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.loginToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.userId;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const payload = decode<{ admin: true; exp: number }>(store.get(ADMIN_COOKIE)?.value);
  return Boolean(payload && payload.admin && payload.exp > Date.now());
}

export async function createAdminSession(): Promise<void> {
  const exp = Date.now() + 1000 * 60 * 60 * 12;
  const store = await cookies();
  store.set(ADMIN_COOKIE, encode({ admin: true, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

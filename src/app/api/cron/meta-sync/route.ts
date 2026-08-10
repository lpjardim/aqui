import { NextResponse } from "next/server";
import { syncActiveCampaigns } from "@/lib/meta";

export const dynamic = "force-dynamic";

/**
 * Disparada pelo Vercel Cron (GET, com `Authorization: Bearer <CRON_SECRET>`
 * automático) ou por um scheduler externo (ex.: Upstash QStash, que só
 * suporta POST). Aceita o segredo tanto no header `Authorization` como num
 * query param `secret=`, para funcionar em qualquer um dos dois casos sem
 * exigir configuração de headers customizados no scheduler externo.
 */
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === cronSecret;
}

async function runSync(): Promise<NextResponse> {
  const results = await syncActiveCampaigns();
  const succeeded = results.filter((result) => result.ok).length;
  const failed = results.length - succeeded;

  console.info(
    `[cron/meta-sync] concluído: ${succeeded}/${results.length} encomendas sincronizadas (${failed} falha(s))`,
  );

  return NextResponse.json({
    ok: true,
    synced: results.length,
    succeeded,
    failed,
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runSync();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runSync();
}

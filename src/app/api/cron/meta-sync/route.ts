import { NextResponse } from "next/server";
import { syncActiveCampaigns } from "@/lib/meta";

export const dynamic = "force-dynamic";

/**
 * Disparada pelo Vercel Cron (GET, com `Authorization: Bearer <CRON_SECRET>`
 * automático) ou por um scheduler externo (Upstash QStash, POST, que reenvia
 * `Authorization: Bearer <CRON_SECRET>` via header forwarding oficial
 * `Upstash-Forward-Authorization`). Autenticação exclusivamente pelo header
 * `Authorization` — nunca por query param, para o segredo nunca aparecer em
 * URLs, logs de acesso ou histórico do browser.
 */
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
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

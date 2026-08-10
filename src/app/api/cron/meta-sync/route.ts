import { NextResponse } from "next/server";
import { syncActiveCampaigns } from "@/lib/meta";

export const dynamic = "force-dynamic";

/**
 * Disparada pelo Vercel Cron (ver `vercel.json`). A Vercel envia
 * automaticamente `Authorization: Bearer <CRON_SECRET>` nas suas próprias
 * invocações — qualquer outro pedido sem esse header é recusado.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

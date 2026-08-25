"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice } from "@/lib/format";
import { getPack } from "@/lib/packs";
import { FREQUENCY_LABELS } from "@/lib/orders";
import { trackDiagnosticEvent } from "@/lib/diagnostic-tracking";
import { RECOMMENDATION_MODEL_VERSION, TIER_LABELS, type Recommendation } from "@/lib/diagnostic/recommendation";
import { DIAGNOSTIC_VERSION, type DiagnosticAnswers } from "@/lib/diagnostic/questions";
import {
  DIAGNOSTIC_HANDOFF_COOKIE,
  DIAGNOSTIC_HANDOFF_MAX_AGE_SECONDS,
  serializeDiagnosticHandoff,
} from "@/lib/diagnostic/handoff";
import { clearDiagnosticSession } from "@/lib/diagnostic/session";

export function RecommendationScreen({
  diagnosticId,
  answers,
  recommendation,
  zone,
  asset,
  onBack,
}: {
  diagnosticId: string;
  answers: DiagnosticAnswers;
  recommendation: Recommendation;
  zone: string;
  asset: { url: string; fileType: string } | null;
  onBack: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    trackDiagnosticEvent("recommendation_viewed", diagnosticId, {
      packId: recommendation.packId,
      billingFrequency: recommendation.billingFrequency,
      tier: recommendation.tier,
    });
    // Só reportar uma vez, na chegada a este ecrã.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pack = getPack(recommendation.packId);
  if (!pack) return null;

  const price = recommendation.billingFrequency === "ONE_TIME" ? pack.price : pack.monthlyPrice;

  function handleStartCheckout() {
    trackDiagnosticEvent("recommended_plan_clicked", diagnosticId, {
      packId: recommendation.packId,
      billingFrequency: recommendation.billingFrequency,
    });

    const cookieValue = serializeDiagnosticHandoff({
      diagnosticId,
      diagnosticVersion: DIAGNOSTIC_VERSION,
      recommendationId: recommendation.id,
      recommendationModelVersion: RECOMMENDATION_MODEL_VERSION,
      answers,
      zone,
      packId: recommendation.packId,
      billingFrequency: recommendation.billingFrequency,
      assets: asset ? [asset] : [],
    });

    document.cookie = `${DIAGNOSTIC_HANDOFF_COOKIE}=${cookieValue}; path=/; max-age=${DIAGNOSTIC_HANDOFF_MAX_AGE_SECONDS}; samesite=lax`;
    clearDiagnosticSession();
    router.push("/pedido");
  }

  return (
    <section>
      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-red-strong">
        A nossa recomendação
      </p>
      <h1 className="mt-3 text-[26px] font-black leading-tight sm:text-[32px]">
        {TIER_LABELS[recommendation.tier]}
      </h1>

      <div className="mt-6 rounded-md border border-line p-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[20px] font-black">
              {formatNumber(pack.visualizations)} visualizações
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {FREQUENCY_LABELS[recommendation.billingFrequency]}
            </p>
          </div>
          <p className="text-[24px] font-black">
            {formatPrice(price)}
            {recommendation.billingFrequency === "MONTHLY" && (
              <span className="text-[14px]">/mês</span>
            )}
          </p>
        </div>
        <p className="mt-2 text-right text-[11px] text-muted">IVA incluído</p>
      </div>

      <div className="mt-6">
        <p className="text-[13px] font-semibold">Porque recomendamos isto:</p>
        <ul className="mt-3 space-y-2">
          {recommendation.reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-[14px] text-muted">
              <span aria-hidden className="text-red-strong">
                •
              </span>
              <span>Porque {reason}.</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" size="lg" onClick={onBack}>
          Voltar
        </Button>
        <Button size="lg" className="sm:min-w-64" onClick={handleStartCheckout}>
          Começar esta campanha
        </Button>
      </div>
    </section>
  );
}

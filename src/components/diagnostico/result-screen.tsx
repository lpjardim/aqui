"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trackDiagnosticEvent } from "@/lib/diagnostic-tracking";
import {
  buildDiagnosticDimensions,
  buildFomoInsights,
  buildMainConclusion,
} from "@/lib/diagnostic/copy";
import type { DiagnosticAnswers } from "@/lib/diagnostic/questions";
import type { DiagnosticScore } from "@/lib/diagnostic/scoring";

export function ResultScreen({
  diagnosticId,
  answers,
  score,
  onContinue,
}: {
  diagnosticId: string;
  answers: DiagnosticAnswers;
  score: DiagnosticScore;
  onContinue: () => void;
}) {
  useEffect(() => {
    trackDiagnosticEvent("diagnostic_result_viewed", diagnosticId, {
      channelDependency: score.channelDependency,
      controllableDistribution: score.controllableDistribution,
      localOpportunity: score.localOpportunity,
    });
    // Só reportar uma vez, na chegada a este ecrã — não em cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dimensions = buildDiagnosticDimensions(answers, score);
  const mainConclusion = buildMainConclusion(score);
  const fomoInsights = buildFomoInsights(answers, score);

  return (
    <section>
      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-red-strong">
        O seu diagnóstico
      </p>

      {mainConclusion && (
        <p className="mt-3 text-[22px] font-black leading-tight sm:text-[26px]">{mainConclusion}</p>
      )}

      <dl className="mt-8 space-y-6 border-t border-line pt-6">
        {dimensions.map((dimension) => (
          <div key={dimension.title}>
            <dt className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
              {dimension.title}
            </dt>
            <dd className="mt-1 text-[19px] font-black">{dimension.level}</dd>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{dimension.description}</p>
          </div>
        ))}
      </dl>

      {fomoInsights.length > 0 && (
        <div className="mt-8 space-y-3 rounded-md border border-line bg-surface p-5">
          {fomoInsights.map((insight) => (
            <p key={insight} className="text-[14px] leading-relaxed">
              {insight}
            </p>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-md border border-line p-6 text-center">
        <h2 className="text-[19px] font-black">Veja como o seu negócio poderia aparecer</h2>
        <p className="mt-2 text-[14px] text-muted">
          Crie gratuitamente uma pré-visualização do seu anúncio no Instagram e Facebook.
        </p>
        <Button size="lg" className="mt-6 w-full sm:w-auto sm:min-w-56" onClick={onContinue}>
          Criar preview
        </Button>
      </div>
    </section>
  );
}

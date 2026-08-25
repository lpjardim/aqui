"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIAGNOSTIC_QUESTIONS,
  TOTAL_DIAGNOSTIC_QUESTIONS,
  type DiagnosticAnswers,
} from "@/lib/diagnostic/questions";
import { computeDiagnosticScore } from "@/lib/diagnostic/scoring";
import { computeRecommendation } from "@/lib/diagnostic/recommendation";
import {
  createDiagnosticId,
  loadDiagnosticSession,
  saveDiagnosticSession,
  type DiagnosticSessionState,
} from "@/lib/diagnostic/session";
import { trackDiagnosticEvent } from "@/lib/diagnostic-tracking";
import type { DiagnosticHeroVariantValue } from "@/lib/diagnostic-hero-constants";
import { useFireMetaEventOnConsent } from "@/lib/meta/use-fire-meta-event";
import { DiagnosticHero } from "@/components/diagnostico/hero";
import { DiagnosticProgressBar } from "@/components/diagnostico/progress-bar";
import { QuestionScreen } from "@/components/diagnostico/question-screen";
import { AnalyzingScreen } from "@/components/diagnostico/analyzing-screen";
import { ResultScreen } from "@/components/diagnostico/result-screen";
import { PreviewScreen, type PreviewData } from "@/components/diagnostico/preview-screen";
import { RecommendationScreen } from "@/components/diagnostico/recommendation-screen";

type Stage = "hero" | "question" | "analyzing" | "result" | "preview" | "recommendation";

function isCompleteAnswers(
  answers: Partial<DiagnosticAnswers>,
): answers is DiagnosticAnswers {
  return (
    answers.primaryAcquisitionChannel !== undefined &&
    answers.predictableReach !== undefined &&
    answers.localAwareness !== undefined &&
    answers.businessGoal !== undefined &&
    answers.urgency !== undefined &&
    answers.targetLocation !== undefined
  );
}

type RestoredDiagnosticState = {
  diagnosticId: string;
  answers: Partial<DiagnosticAnswers>;
  stage: Stage;
  questionIndex: number;
};

/**
 * Deriva de que ponto retomar (secções 43-44 do pedido original) a partir
 * de uma sessão anterior guardada em `sessionStorage` — pura, sem React,
 * fácil de testar isoladamente. `sessionStorage` só existe no browser, por
 * isso só pode ser aplicada DEPOIS da montagem (nunca no render inicial, que
 * corre também no servidor): aplicá-la mais cedo faria o 1º render no
 * cliente (sempre "hero", sem `window`) divergir do resultado desta função
 * (que pode devolver "question"/"result"), causando um erro de hidratação.
 *
 * Devolve SEMPRE um `diagnosticId` não vazio (gera um novo já aqui se a
 * sessão não tiver nenhum) — necessário porque, com o A/B/C test do Hero, já
 * há eventos a gravar (`diagnostic_hero_view`/`diagnostic_hero_cta_clicked`)
 * antes de o utilizador responder a qualquer pergunta.
 */
function computeInitialDiagnosticState(session: DiagnosticSessionState | null): RestoredDiagnosticState {
  const hasAnyAnswer = session ? Object.keys(session.answers).length > 0 : false;
  if (!session || !hasAnyAnswer) {
    return {
      diagnosticId: session?.diagnosticId || createDiagnosticId(),
      answers: {},
      stage: "hero",
      questionIndex: 0,
    };
  }

  const nextIndex = DIAGNOSTIC_QUESTIONS.findIndex(
    (question) => session.answers[question.key] === undefined,
  );

  if (nextIndex === -1 && isCompleteAnswers(session.answers)) {
    return { diagnosticId: session.diagnosticId, answers: session.answers, stage: "result", questionIndex: 0 };
  }
  if (nextIndex >= 0) {
    return { diagnosticId: session.diagnosticId, answers: session.answers, stage: "question", questionIndex: nextIndex };
  }
  return { diagnosticId: session.diagnosticId, answers: session.answers, stage: "hero", questionIndex: 0 };
}

export function DiagnosticFlow({ heroVariant }: { heroVariant: DiagnosticHeroVariantValue }) {
  // Sempre "hero" no 1º render, em ambos os lados (servidor e cliente) —
  // evita qualquer erro de hidratação. A retoma real (se houver) só é
  // aplicada depois de montar, no efeito abaixo.
  const [diagnosticId, setDiagnosticId] = useState("");
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
  const [stage, setStage] = useState<Stage>("hero");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const restored = useRef(false);

  // Mesma métrica que o resto do site (ViewContent no ecrã inicial de um
  // funil) — reaproveita `useFireMetaEventOnConsent`, mesmo padrão de
  // `MetaLandingView`. Depende sempre de consentimento de marketing.
  useFireMetaEventOnConsent("ViewContent", { content_category: "diagnostic" });

  // Retoma uma corrida anterior do diagnóstico na mesma sessão do browser
  // (secções 43-44) — nunca se mistura com o sticky assignment dos testes
  // A/B/C. Só pode correr depois de montar (ver nota em
  // `computeInitialDiagnosticState`), por isso o eslint-disable: aqui é
  // hidratação de estado a partir de `sessionStorage` (fonte só do
  // browser), não sincronização contínua com um sistema externo.
  //
  // Ao contrário da versão anterior a este teste, um `diagnosticId` é
  // sempre atribuído aqui (mesmo que o utilizador ainda esteja no Hero, sem
  // nenhuma resposta) — necessário para associar `diagnostic_hero_view`/
  // `diagnostic_hero_cta_clicked` à mesma corrida usada depois em
  // `diagnostic_started`.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const next = computeInitialDiagnosticState(loadDiagnosticSession());

    setDiagnosticId(next.diagnosticId);
    if (next.stage !== "hero") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(next.answers);
      setQuestionIndex(next.questionIndex);
      setStage(next.stage);
    } else {
      saveDiagnosticSession({ diagnosticId: next.diagnosticId, answers: next.answers });
      trackDiagnosticEvent("diagnostic_hero_view", next.diagnosticId, {
        heroVariant,
        referrer: typeof document !== "undefined" ? document.referrer : null,
      });
    }
  }, [heroVariant]);

  const completeAnswers = useMemo(
    () => (isCompleteAnswers(answers) ? answers : null),
    [answers],
  );

  const score = useMemo(
    () => (completeAnswers ? computeDiagnosticScore(completeAnswers) : null),
    [completeAnswers],
  );

  const recommendation = useMemo(
    () => (completeAnswers && score ? computeRecommendation(completeAnswers, score) : null),
    [completeAnswers, score],
  );

  function handleStart() {
    // `diagnosticId` já está garantido pelo efeito de montagem acima — o
    // fallback aqui é só defensivo (ex.: clique antes do efeito correr).
    const id = diagnosticId || createDiagnosticId();
    setDiagnosticId(id);
    saveDiagnosticSession({ diagnosticId: id, answers });
    trackDiagnosticEvent("diagnostic_hero_cta_clicked", id, { heroVariant });
    trackDiagnosticEvent("diagnostic_started", id, { heroVariant });
    setQuestionIndex(0);
    setStage("question");
  }

  function handleAnswer(value: string) {
    const question = DIAGNOSTIC_QUESTIONS[questionIndex];
    const updated = { ...answers, [question.key]: value } as Partial<DiagnosticAnswers>;
    setAnswers(updated);
    saveDiagnosticSession({ diagnosticId, answers: updated });
    trackDiagnosticEvent("diagnostic_question_answered", diagnosticId, {
      step: questionIndex + 1,
      key: question.key,
      value,
    });

    if (questionIndex + 1 < TOTAL_DIAGNOSTIC_QUESTIONS) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    trackDiagnosticEvent("diagnostic_completed", diagnosticId, { answers: updated });
    setStage("analyzing");
  }

  function handleQuestionBack() {
    if (questionIndex === 0) {
      setStage("hero");
      return;
    }
    setQuestionIndex((current) => current - 1);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      {stage === "hero" && <DiagnosticHero variant={heroVariant} onStart={handleStart} />}

      {stage === "question" && (
        <>
          <DiagnosticProgressBar
            current={questionIndex + 1}
            total={TOTAL_DIAGNOSTIC_QUESTIONS}
            onBack={handleQuestionBack}
          />
          <div className="mt-8">
            <QuestionScreen
              question={DIAGNOSTIC_QUESTIONS[questionIndex]}
              value={answers[DIAGNOSTIC_QUESTIONS[questionIndex].key]}
              onAnswer={handleAnswer}
            />
          </div>
        </>
      )}

      {stage === "analyzing" && <AnalyzingScreen onDone={() => setStage("result")} />}

      {stage === "result" && completeAnswers && score && (
        <ResultScreen
          diagnosticId={diagnosticId}
          answers={completeAnswers}
          score={score}
          onContinue={() => setStage("preview")}
        />
      )}

      {stage === "preview" && completeAnswers && (
        <PreviewScreen
          diagnosticId={diagnosticId}
          businessGoal={completeAnswers.businessGoal}
          zone={completeAnswers.targetLocation}
          onBack={() => setStage("result")}
          onContinue={(data) => {
            setPreviewData(data);
            setStage("recommendation");
          }}
        />
      )}

      {stage === "recommendation" && completeAnswers && recommendation && (
        <RecommendationScreen
          diagnosticId={diagnosticId}
          answers={completeAnswers}
          recommendation={recommendation}
          zone={completeAnswers.targetLocation}
          asset={previewData?.asset ?? null}
          onBack={() => setStage("preview")}
        />
      )}
    </div>
  );
}

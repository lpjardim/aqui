"use client";

import { useEffect, useRef, useState } from "react";

/** 1-2 segundos, sem loaders falsos nem barras de progresso enganadoras —
 * só um pequeno reforço visual de que as respostas estão a ser
 * processadas antes do resultado aparecer. */
const STEPS = [
  "Como os seus clientes chegam hoje",
  "Capacidade de aumentar a visibilidade",
  "Melhor próximo passo para o seu negócio",
];

const STEP_INTERVAL_MS = 380;
const TOTAL_DURATION_MS = 1500;

export function AnalyzingScreen({ onDone }: { onDone: () => void }) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setVisibleSteps((current) => Math.min(STEPS.length, current + 1));
    }, STEP_INTERVAL_MS);
    const doneTimer = setTimeout(() => onDoneRef.current(), TOTAL_DURATION_MS);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-[22px] font-black">A analisar o seu negócio…</h1>
      <ul className="mt-8 space-y-3">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={`text-[14px] transition-opacity duration-300 ${
              index < visibleSteps ? "text-ink opacity-100" : "text-muted opacity-30"
            }`}
          >
            {step}
          </li>
        ))}
      </ul>
    </section>
  );
}

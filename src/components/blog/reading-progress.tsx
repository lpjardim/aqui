"use client";

import { useEffect, useState } from "react";

/**
 * Barra discreta de progresso de leitura, fixa no topo. Mede o scroll da
 * página inteira (o artigo ocupa praticamente todo o documento), sem
 * depender de refs para um elemento específico.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div className="absolute inset-x-0 top-0 h-[3px] bg-transparent" aria-hidden>
      <div
        className="h-full bg-red-strong"
        style={{ width: `${progress}%`, transition: "width 120ms linear" }}
      />
    </div>
  );
}

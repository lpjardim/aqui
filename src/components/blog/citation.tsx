export type Source = {
  id: number;
  label: string;
  publisher: string;
  url: string;
};

/**
 * Marcador de nota discreto, tipo footnote, que liga à secção "Fontes" no
 * fim do artigo. Mantém as fontes visíveis sem interromper a leitura.
 */
export function Cite({ n }: { n: number }) {
  return (
    <sup>
      <a
        id={`ref-${n}`}
        href={`#fonte-${n}`}
        className="ml-0.5 text-[11px] font-semibold text-red-strong no-underline hover:underline"
      >
        [{n}]
      </a>
    </sup>
  );
}

export function SourcesList({ sources }: { sources: Source[] }) {
  return (
    <ol className="space-y-3">
      {sources.map((source) => (
        <li key={source.id} id={`fonte-${source.id}`} className="scroll-mt-24 text-[13px] leading-relaxed text-muted">
          <a href={`#ref-${source.id}`} aria-label={`Voltar ao texto, nota ${source.id}`} className="text-muted-soft">
            {source.id}.
          </a>{" "}
          <span className="font-medium text-ink">{source.publisher}</span> — {source.label}{" "}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-red-strong underline underline-offset-2"
          >
            {source.url}
          </a>
        </li>
      ))}
    </ol>
  );
}

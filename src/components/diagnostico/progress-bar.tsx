export function DiagnosticProgressBar({
  current,
  total,
  onBack,
}: {
  current: number;
  total: number;
  onBack?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px] text-muted">
        {onBack ? (
          <button type="button" onClick={onBack} className="font-semibold text-ink underline underline-offset-2">
            Voltar
          </button>
        ) : (
          <span />
        )}
        <span>
          Pergunta {current} de {total}
        </span>
      </div>
      <div className="mt-3 h-1 w-full bg-line">
        <div
          className="h-1 bg-red-strong transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

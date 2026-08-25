import { Check } from "@/components/icons";
import type { QuestionDefinition } from "@/lib/diagnostic/questions";

/**
 * Renderer genérico para as 6 perguntas — dois "kinds": `cards` (opções
 * grandes, uma por linha, mesmo padrão visual dos passos 3/4 do checkout em
 * `order-form.tsx`) e `select` (só a pergunta 6, zona — a lista de 19
 * opções não cabe bem em cards grandes).
 */
export function QuestionScreen({
  question,
  value,
  onAnswer,
}: {
  question: QuestionDefinition;
  value: string | undefined;
  onAnswer: (value: string) => void;
}) {
  return (
    <section>
      <h1 className="text-[24px] font-black leading-tight sm:text-[30px]">{question.title}</h1>

      {question.kind === "cards" ? (
        <div className="mt-8 space-y-3">
          {question.options.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onAnswer(option.value)}
                className={`flex w-full items-center justify-between rounded-md border p-5 text-left text-[16px] font-semibold transition-colors ${
                  selected
                    ? "border-red-strong bg-red-strong/[0.03]"
                    : "border-line hover:border-line-strong"
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                    selected ? "border-red-strong bg-red-strong text-white" : "border-line-strong"
                  }`}
                >
                  {selected && <Check className="size-3" />}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <label className="block text-[13px] font-semibold" htmlFor="target-location">
            Zona
          </label>
          <select
            id="target-location"
            value={value ?? ""}
            onChange={(event) => onAnswer(event.target.value)}
            className="mt-2 h-13 w-full rounded-md border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-ink"
          >
            <option value="" disabled>
              Escolher zona
            </option>
            {question.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}

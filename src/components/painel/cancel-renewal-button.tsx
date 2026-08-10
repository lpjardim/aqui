"use client";

import type { FormEvent } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cancelRenewal, type CancelRenewalState } from "@/app/painel/actions";

const INITIAL: CancelRenewalState = { error: null, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="md" disabled={pending}>
      {pending ? "A cancelar…" : "Cancelar renovação"}
    </Button>
  );
}

export function CancelRenewalButton({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(cancelRenewal, INITIAL);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      "Cancelar a renovação mensal?\n\n" +
        "O ciclo atual continua a decorrer normalmente até ao fim. Só não haverá cobrança nem novo ciclo no mês seguinte.",
    );
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="flex flex-col items-start gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton />
      {state.error && (
        <p role="alert" className="text-[13px] text-red-strong">
          {state.error}
        </p>
      )}
      {state.message && <p className="text-[13px] text-muted">{state.message}</p>}
    </form>
  );
}

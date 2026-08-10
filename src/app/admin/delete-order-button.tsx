"use client";

import type { FormEvent } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { deleteOrder, type DeleteOrderState } from "./actions";

const INITIAL: DeleteOrderState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="md"
      disabled={pending}
      className="h-8 px-3 text-[12px] text-red-strong hover:bg-red-strong/[0.06]"
    >
      {pending ? "A eliminar…" : "Eliminar"}
    </Button>
  );
}

/**
 * Só deve ser montado para encomendas em "Aguarda pagamento" — a
 * verificação real de elegibilidade acontece sempre no servidor
 * (`deleteOrder`), isto é apenas para não mostrar a ação onde não se aplica.
 */
export function DeleteOrderButton({
  orderId,
  companyName,
  email,
}: {
  orderId: string;
  companyName: string;
  email: string;
}) {
  const [state, action] = useActionState(deleteOrder, INITIAL);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Eliminar definitivamente a encomenda de "${companyName}" (${email})?\n\n` +
        "Esta ação não pode ser desfeita.",
    );
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="flex flex-col items-end gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton />
      {state.error && (
        <p role="alert" className="max-w-56 text-right text-[11px] text-red-strong">
          {state.error}
        </p>
      )}
    </form>
  );
}

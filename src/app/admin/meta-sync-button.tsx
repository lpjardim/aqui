"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { syncMetaNow, type MetaSyncState } from "./actions";

const INITIAL: MetaSyncState = { message: null, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="outline" className="h-9 px-4 text-[13px]" disabled={pending}>
      {pending ? "A sincronizar…" : "Sincronizar Meta"}
    </Button>
  );
}

export function MetaSyncButton() {
  const [state, action] = useActionState(syncMetaNow, INITIAL);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <SubmitButton />
      {state.error && (
        <p role="alert" className="text-[12px] text-red-strong">
          {state.error}
        </p>
      )}
      {!state.error && state.message && (
        <p className="text-[12px] text-muted">{state.message}</p>
      )}
    </form>
  );
}

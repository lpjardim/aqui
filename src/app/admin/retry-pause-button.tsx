"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { retryPauseMetaCampaign, type RetryPauseState } from "./actions";

const INITIAL: RetryPauseState = { message: null, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="outline" className="h-8 px-3 text-[12px]" disabled={pending}>
      {pending ? "A tentar…" : "Tentar pausar novamente"}
    </Button>
  );
}

export function RetryPauseButton({ cycleId }: { cycleId: string }) {
  const [state, action] = useActionState(retryPauseMetaCampaign, INITIAL);

  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="cycleId" value={cycleId} />
      <SubmitButton />
      {state.error && (
        <p role="alert" className="text-[11px] text-red-strong">
          {state.error}
        </p>
      )}
      {state.message && <p className="text-[11px] text-green-strong">{state.message}</p>}
    </form>
  );
}

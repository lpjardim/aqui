"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestLoginLink, type LoginState } from "./actions";

const INITIAL: LoginState = { message: null, sent: false };

export function LoginForm() {
  const [state, action, pending] = useActionState(requestLoginLink, INITIAL);

  return (
    <form action={action} className="mt-8">
      <label className="block text-[13px] font-semibold" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="mt-2 h-13 w-full rounded-md border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-ink"
      />

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending}>
        {pending ? "A enviar…" : "Receber link de acesso"}
      </Button>

      {state.message && (
        <p
          role="status"
          className={`mt-5 text-[14px] ${state.sent ? "text-muted" : "text-red-strong"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

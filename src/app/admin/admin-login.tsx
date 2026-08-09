"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { adminLogin, type AdminLoginState } from "./actions";

const INITIAL: AdminLoginState = { error: null };

export function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, INITIAL);

  return (
    <form action={action} className="mx-auto mt-20 max-w-sm">
      <h1 className="text-[24px] font-black">Painel interno</h1>

      <label className="mt-8 block text-[13px] font-semibold" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="mt-2 h-13 w-full rounded-md border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-ink"
      />

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending}>
        {pending ? "A entrar…" : "Entrar"}
      </Button>

      {state.error && (
        <p role="alert" className="mt-4 text-[14px] text-red-strong">
          {state.error}
        </p>
      )}
    </form>
  );
}

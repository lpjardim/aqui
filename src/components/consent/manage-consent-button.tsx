"use client";

import { clearConsentCookie } from "@/components/consent/cookie-banner";

/** Usado em `/cookies` para reabrir o banner e permitir mudar de escolha. */
export function ManageConsentButton() {
  return (
    <button
      type="button"
      onClick={clearConsentCookie}
      className="text-[14px] font-semibold text-ink underline underline-offset-2 hover:text-red-strong"
    >
      Gerir preferências de cookies
    </button>
  );
}

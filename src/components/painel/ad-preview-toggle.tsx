"use client";

import { useState } from "react";

/**
 * Pré-visualização do anúncio Meta, gerada no servidor a partir da Ad
 * Previews API (`getAdPreviewHtml`). O HTML recebido é sempre gerado pelo
 * nosso próprio backend a partir da resposta oficial da Meta — nunca vem de
 * input do utilizador — por isso é seguro injetá-lo diretamente.
 */
export function AdPreviewToggle({
  label,
  html,
  defaultOpen = false,
}: {
  label: string;
  html: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-[13px] text-muted underline underline-offset-2 transition-colors hover:text-ink"
      >
        {label} {open ? "↑" : "↗"}
      </button>
      {open && (
        <div
          className="mt-3 w-full max-w-sm overflow-hidden rounded-md border border-line [&_iframe]:w-full"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}

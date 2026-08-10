"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  associateMetaCampaign,
  confirmMetaCampaign,
  type AssociateMetaState,
} from "./actions";

const INITIAL: AssociateMetaState = { status: "idle", message: null, matches: [] };

function AssociateButton({ alreadyAssociated }: { alreadyAssociated: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button variant="outline" className="h-9 px-3 text-[12px]" disabled={pending}>
      {pending ? "A procurar…" : alreadyAssociated ? "Reassociar automaticamente" : "Associar automaticamente"}
    </Button>
  );
}

function CopyNameButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="h-9 rounded-sm border border-line-strong px-3 text-[12px] transition-colors hover:bg-surface"
    >
      {copied ? "Copiado ✓" : "Copiar nome"}
    </button>
  );
}

export function MetaAssociation({
  orderId,
  expectedName,
  metaCampaignId,
}: {
  orderId: string;
  expectedName: string;
  metaCampaignId: string | null;
}) {
  const [state, action] = useActionState(associateMetaCampaign, INITIAL);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-[12px] text-muted">Nome da campanha Meta</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="rounded-sm border border-line bg-surface px-2 py-1.5 text-[12px]">
            {expectedName}
          </code>
          <CopyNameButton name={expectedName} />
        </div>
        <p className="mt-1 text-[11px] text-muted">
          Crie a campanha no Ads Manager com este nome exato — a associação é automática.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action={action}>
          <input type="hidden" name="orderId" value={orderId} />
          <AssociateButton alreadyAssociated={Boolean(metaCampaignId)} />
        </form>

        {metaCampaignId && state.status !== "associated" && (
          <p className="text-[12px] text-muted">
            Associada · Campaign ID: <span className="font-mono">{metaCampaignId}</span>
          </p>
        )}

        {state.status === "associated" && (
          <p className="text-[12px] text-green-strong">{state.message}</p>
        )}
        {state.status === "not_found" && (
          <p className="text-[12px] text-muted">{state.message}</p>
        )}
        {state.status === "error" && (
          <p role="alert" className="text-[12px] text-red-strong">
            {state.message}
          </p>
        )}
      </div>

      {state.status === "multiple" && (
        <div className="rounded-sm border border-line-strong bg-surface p-3">
          <p className="text-[12px] font-medium">{state.message}</p>
          <ul className="mt-2 space-y-1.5">
            {state.matches.map((match) => (
              <li key={match.id} className="flex items-center justify-between gap-3">
                <span className="text-[12px]">
                  {match.name} <span className="text-muted">({match.effectiveStatus})</span>{" "}
                  <span className="font-mono text-muted">· {match.id}</span>
                </span>
                <form action={confirmMetaCampaign}>
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="campaignId" value={match.id} />
                  <Button variant="outline" className="h-7 px-2 text-[11px]">
                    Usar esta
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

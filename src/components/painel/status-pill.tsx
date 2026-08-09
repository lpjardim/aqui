import type { OrderStatus } from "@/generated/prisma/enums";
import { CUSTOMER_STATUS_LABELS } from "@/lib/orders";

const DOT: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-muted",
  PAID: "bg-muted",
  IN_REVIEW: "bg-muted",
  ACTIVE: "bg-red-strong",
  COMPLETED: "bg-ink",
  REJECTED: "bg-red-strong",
  REFUNDED: "bg-muted",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-[14px] font-medium">
      <span className={`size-2 rounded-full ${DOT[status]}`} aria-hidden />
      {CUSTOMER_STATUS_LABELS[status]}
    </span>
  );
}

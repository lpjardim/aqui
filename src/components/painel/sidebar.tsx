"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/painel", label: "Campanhas" },
  { href: "/painel/documentos", label: "Documentos" },
];

export function Sidebar({ name, companyName }: { name: string; companyName: string }) {
  const pathname = usePathname();

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <aside className="flex shrink-0 flex-col bg-ink text-white md:min-h-dvh md:w-60">
      <div className="px-6 py-6">
        <Link href="/painel">
          <Logo size="sm" tone="light" />
        </Link>
      </div>

      <nav className="flex gap-2 px-3 pb-4 md:flex-1 md:flex-col md:gap-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/painel"
              ? pathname === "/painel" || pathname.startsWith("/painel/campanhas")
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-sm px-3 py-2.5 text-[14px] font-medium transition-colors ${
                active ? "bg-red-strong text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden items-center gap-3 border-t border-white/10 px-6 py-5 md:flex">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-[12px] font-bold">
          {initials || "A"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">{name}</span>
          <span className="block truncate text-[12px] text-white/60">{companyName}</span>
        </span>
      </div>
    </aside>
  );
}

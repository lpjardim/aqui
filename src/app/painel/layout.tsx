import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/painel/sidebar";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false },
};

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/entrar");
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar name={user.name} companyName={user.companyName} />
      <main className="flex-1 px-5 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}

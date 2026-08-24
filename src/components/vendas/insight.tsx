export function Insight() {
  return (
    <section className="border-b border-line bg-surface py-16 md:py-24">
      <div className="container-page">
        <h2 className="max-w-2xl text-[28px] font-black leading-tight sm:text-[36px]">
          Antes de escolherem o seu negócio, têm de o conhecer.
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-white p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted-soft">
              Antes
            </p>
            <p className="mt-2 text-[17px] font-semibold leading-snug">
              &ldquo;Publicidade no Instagram parece complicada.&rdquo;
            </p>
          </div>

          <div className="rounded-lg border-2 border-red-strong bg-white p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-red-strong">
              Depois
            </p>
            <p className="mt-2 text-[17px] font-semibold leading-snug">
              &ldquo;Escolho quanto quero aparecer e a Aqui. trata do resto.&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-8">
          <p className="max-w-2xl text-[16px] leading-relaxed text-muted sm:text-[17px]">
            Num estudo da BrightLocal,{" "}
            <a
              href="https://www.brightlocal.com/research/consumer-search-behavior-decisions/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline underline-offset-2"
            >
              72% dos consumidores locais consideram três empresas ou menos
            </a>{" "}
            antes de tomar uma decisão.
          </p>
          <p className="mt-2 max-w-2xl text-[16px] font-semibold text-ink sm:text-[17px]">
            Para entrar nessa lista curta, o seu negócio precisa primeiro de ser conhecido.
          </p>
        </div>
      </div>
    </section>
  );
}

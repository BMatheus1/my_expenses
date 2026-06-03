import Link from "next/link";

type PricingSectionProps = {
  onCtaClick: (label: string) => void;
};

const VALUE_ITEMS = [
  "Preço único",
  "1 mês grátis",
  "Depois R$ 8,99/mês",
  "Sem anúncios",
  "Cancele quando quiser",
  "Pessoal e pequenos negócios",
];

export function PricingSection({ onCtaClick }: PricingSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="grid gap-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_0.8fr] lg:p-10">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
            Preço único
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            1 mês grátis para organizar sua vida financeira.
          </h2>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            Depois R$ 8,99/mês para continuar usando o My Expenses completo.
            Sem anúncios, sem plano grátis permanente e sem tabela de planos.
          </p>

          <Link
            href="/app?auth=register&focus=auth"
            onClick={() => onCtaClick("Pricing começar teste grátis")}
            className="mt-6 inline-flex rounded-full bg-emerald-600 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Começar teste grátis
          </Link>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {VALUE_ITEMS.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-700"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

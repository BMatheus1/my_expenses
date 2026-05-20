import type { Business } from "@/app/types/business";

export function BusinessHeader({
  business,
  stats,
  onEdit,
  onDelete,
}: {
  business: Business;
  stats: {
    materiais: number;
    servicos: number;
    vendas: number;
  };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <header className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
            {business.type}
          </p>
          <h1 className="mt-2 texto-quebra text-3xl font-black tracking-tight text-stone-950">
            {business.name}
          </h1>
          {business.description ? (
            <p className="mt-2 max-w-3xl texto-quebra text-sm text-stone-500">
              {business.description}
            </p>
          ) : (
            <p className="mt-2 max-w-3xl text-sm text-stone-500">
              Controle inteligente de estoque, fichas de custo e lucro bruto.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm font-black text-stone-700 transition hover:bg-stone-50"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <HeaderMiniStat label="Itens no estoque" value={stats.materiais} />
        <HeaderMiniStat label="Serviços" value={stats.servicos} />
        <HeaderMiniStat label="Vendas" value={stats.vendas} />
      </div>
    </header>
  );
}

function HeaderMiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl bg-stone-50 px-4 py-3">
      <p className="text-lg font-black text-stone-950">{value}</p>
      <p className="text-xs font-semibold text-stone-500">{label}</p>
    </div>
  );
}
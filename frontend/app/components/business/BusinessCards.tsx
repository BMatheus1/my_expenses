import type {
  BusinessMaterial,
  BusinessRecipeItem,
  BusinessSale,
  BusinessService,
} from "@/app/types/business";

import { Badge, InfoLine } from "./BusinessShared";
import { formatCurrency, formatDate, formatNumber } from "./businessUtils";

export function MaterialCard({
  material,
  onEdit,
  onDelete,
}: {
  material: BusinessMaterial;
  onEdit: (material: BusinessMaterial) => void;
  onDelete: (material: BusinessMaterial) => void;
}) {
  const isLowStock = material.stock_quantity <= 3;

  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="texto-quebra font-black text-stone-950">
              {material.name}
            </h3>

            {isLowStock ? <Badge tone="danger">Estoque baixo</Badge> : null}
          </div>

          <p className="mt-1 texto-quebra text-sm text-stone-500">
            {material.category}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(material)}
            className="rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => onDelete(material)}
            className="rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <InfoLine
          label="Estoque atual"
          value={`${formatNumber(material.stock_quantity)} ${material.unit}`}
        />
        <InfoLine
          label="Custo unitário"
          value={formatCurrency(material.unit_cost)}
        />
        <InfoLine
          label="Valor atual"
          value={formatCurrency(material.stock_quantity * material.unit_cost)}
        />
        <InfoLine label="Fornecedor" value={material.supplier || "-"} />
      </div>
    </article>
  );
}

export function ServiceResumeCard({ service }: { service: BusinessService }) {
  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="texto-quebra font-black text-stone-950">
            {service.name}
          </p>
          <p className="texto-quebra text-sm text-stone-500">
            {service.category}
          </p>
        </div>

        <p className="shrink-0 text-right text-sm font-black text-stone-950">
          {formatCurrency(service.price)}
        </p>
      </div>

      <div className="mt-3 grid min-w-0 gap-2 text-sm md:grid-cols-3">
        <InfoLine label="Custo" value={formatCurrency(service.material_cost)} />
        <InfoLine label="Lucro" value={formatCurrency(service.gross_profit)} />
        <InfoLine
          label="Capacidade"
          value={
            service.current_capacity === null ||
            service.current_capacity === undefined
              ? "-"
              : `${service.current_capacity}x`
          }
        />
      </div>
    </article>
  );
}

export function ServiceDetailsCard({
  service,
  onEditService,
  onDeleteService,
  onManageRecipe,
}: {
  service: BusinessService;
  onEditService: (service: BusinessService) => void;
  onDeleteService: (service: BusinessService) => void;
  onManageRecipe: (service: BusinessService) => void;
}) {
  const hasRecipe = service.materials.length > 0;

  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 p-5 transition hover:border-emerald-200 hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-widest text-stone-400">
            {service.category}
          </p>

          <h3 className="mt-1 texto-quebra text-lg font-black text-stone-950">
            {service.name}
          </h3>

          <p className="mt-1 texto-quebra text-sm text-stone-500">
            {hasRecipe
              ? "Ficha de custo vinculada"
              : "Sem ficha de custo vinculada"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-full bg-stone-900 px-3 py-1 text-sm font-black text-white">
            {formatCurrency(service.price)}
          </span>

          <button
            type="button"
            onClick={() => onEditService(service)}
            className="rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => onManageRecipe(service)}
            className="rounded-full border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            {hasRecipe ? "Ver ficha" : "Montar ficha"}
          </button>

          <button
            type="button"
            onClick={() => onDeleteService(service)}
            className="rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <InfoLine
          label="Ficha"
          value={hasRecipe ? `${service.materials.length} item(ns)` : "Pendente"}
        />
        <InfoLine label="Custo" value={formatCurrency(service.material_cost)} />
        <InfoLine
          label="Lucro bruto"
          value={formatCurrency(service.gross_profit)}
        />
        <InfoLine
          label="Margem"
          value={`${formatNumber(service.gross_margin_percent)}%`}
        />
      </div>
    </article>
  );
}

export function RecipeItemRow({
  service,
  item,
  onEdit,
  onDelete,
}: {
  service: BusinessService;
  item: BusinessRecipeItem;
  onEdit: (service: BusinessService, item: BusinessRecipeItem) => void;
  onDelete: (service: BusinessService, item: BusinessRecipeItem) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-50 p-3 text-sm">
      <div className="min-w-0">
        <p className="texto-quebra font-bold text-stone-800">
          {item.material_name}
        </p>

        <p className="texto-quebra text-stone-500">
          Usa {formatNumber(item.quantity_used)} {item.unit} x{" "}
          {formatCurrency(item.unit_cost)}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <p className="font-black text-stone-950">
          {formatCurrency(item.total_cost)}
        </p>

        <button
          type="button"
          onClick={() => onEdit(service, item)}
          className="rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-white"
        >
          Editar
        </button>

        <button
          type="button"
          onClick={() => onDelete(service, item)}
          className="rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

export function FichaResumo({
  service,
  onEditItem,
  onDeleteItem,
}: {
  service: BusinessService;
  onEditItem: (service: BusinessService, item: BusinessRecipeItem) => void;
  onDeleteItem: (service: BusinessService, item: BusinessRecipeItem) => void;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="texto-quebra font-black text-stone-950">
            Ficha atual: {service.name}
          </h3>

          <p className="mt-1 texto-quebra text-sm text-stone-500">
            Custo total: {formatCurrency(service.material_cost)} • Lucro bruto:{" "}
            {formatCurrency(service.gross_profit)}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-700">
          {service.current_capacity === null ||
          service.current_capacity === undefined
            ? "Sem capacidade"
            : `${service.current_capacity} venda(s)`}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {service.materials.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum material adicionado ainda.
          </p>
        ) : null}

        {service.materials.map((item) => (
          <RecipeItemRow
            key={item.id}
            service={service}
            item={item}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
          />
        ))}
      </div>
    </div>
  );
}

export function SaleCard({ sale }: { sale: BusinessSale }) {
  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="texto-quebra font-black text-stone-950">
            {sale.service_name}
          </h3>

          <p className="texto-quebra text-sm text-stone-500">
            {formatDate(sale.sale_date)} • {sale.payment_method}
          </p>
        </div>

        <p className="shrink-0 text-right font-black text-stone-950">
          {formatCurrency(sale.total_amount)}
        </p>
      </div>

      <div className="mt-3 grid min-w-0 gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <InfoLine label="Qtd." value={`${sale.quantity}`} />
        <InfoLine
          label="Materiais"
          value={formatCurrency(sale.total_material_cost)}
        />
        <InfoLine label="Lucro" value={formatCurrency(sale.gross_profit)} />
        <InfoLine
          label="Margem"
          value={`${formatNumber(sale.gross_margin_percent)}%`}
        />
      </div>
    </article>
  );
}

export function AlertRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="texto-quebra font-black text-amber-950">{title}</p>

      <p className="mt-1 texto-quebra text-sm text-amber-800">
        {description}
      </p>
    </div>
  );
}
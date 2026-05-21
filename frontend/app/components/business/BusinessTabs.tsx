import type { FormEvent } from "react";

import type {
  BusinessDashboard,
  BusinessMaterial,
  BusinessRecipeItem,
  BusinessSale,
  BusinessService,
} from "@/app/types/business";

import {
  FORMAS_PAGAMENTO,
  TIPOS_NEGOCIO,
  UNIDADES,
} from "./businessConstants";
import type {
  BusinessFormState,
  BusinessTab,
  MaterialFormState,
  RecipeFormState,
  SaleFormState,
  ServiceFormState,
  StockStats,
} from "./businessTypes";
import {
  AlertRow,
  FichaResumo,
  MaterialCard,
  SaleCard,
  ServiceDetailsCard,
  ServiceResumeCard,
} from "./BusinessCards";
import {
  Badge,
  EmptyList,
  HealthCard,
  InfoLine,
  InputField,
  MetricCard,
  PrimaryButton,
  SectionCard,
  SelectField,
  TextareaField,
} from "./BusinessShared";
import {
  calculatePreviewUnitCost,
  formatCurrency,
  formatNumber,
  getNextActionMessage,
} from "./businessUtils";

export function CreateBusinessCard({
  form,
  saving,
  onChange,
  onSubmit,
}: {
  form: BusinessFormState;
  saving: boolean;
  onChange: (form: BusinessFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SectionCard>
      <div className="mb-6">
        <p className="text-sm font-bold text-emerald-700">Novo negócio</p>
        <h1 className="texto-quebra text-2xl font-black tracking-tight text-stone-950">
          Crie uma área para controlar custos, estoque, serviços e vendas
        </h1>
        <p className="mt-2 texto-quebra text-sm text-stone-500">
          Ideal para salão, marmitaria, loja, artesanato, manutenção, construção
          e qualquer atividade que precise calcular custo por venda.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Nome do negócio"
          value={form.name}
          onChange={(value) => onChange({ ...form, name: value })}
          placeholder="Ex: Studio Beleza Ana"
          required
        />

        <SelectField
          label="Tipo"
          value={form.type}
          onChange={(value) => onChange({ ...form, type: value })}
          options={TIPOS_NEGOCIO}
        />

        <div className="md:col-span-2">
          <TextareaField
            label="Descrição opcional"
            value={form.description}
            onChange={(value) => onChange({ ...form, description: value })}
            placeholder="Ex: Controle de serviços, materiais e vendas do salão."
          />
        </div>

        <div className="md:col-span-2">
          <PrimaryButton disabled={saving}>
            {saving ? "Criando..." : "Criar negócio"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}

export function TabNavigation({
  activeTab,
  onChange,
}: {
  activeTab: BusinessTab;
  onChange: (tab: BusinessTab) => void;
}) {
  const tabs: { id: BusinessTab; label: string; description: string }[] = [
    {
      id: "resumo",
      label: "Visão geral",
      description: "Saúde do negócio",
    },
    {
      id: "estoque",
      label: "Estoque",
      description: "Materiais e custos",
    },
    {
      id: "servicos",
      label: "Serviços",
      description: "O que você vende",
    },
    {
      id: "fichas",
      label: "Fichas de custo",
      description: "Materiais por serviço",
    },
    {
      id: "vendas",
      label: "Vendas",
      description: "Entradas e baixa",
    },
  ];

  return (
    <nav className="grid gap-3 md:grid-cols-5">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-3xl border p-4 text-left transition ${
              active
                ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                : "border-stone-200 bg-white text-stone-700 hover:border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            <span className="block truncate text-sm font-black">
              {tab.label}
            </span>

            <span
              className={`mt-1 block truncate text-xs ${
                active ? "text-emerald-50" : "text-stone-400"
              }`}
            >
              {tab.description}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function ResumoTab({
  dashboard,
  materiais,
  servicos,
  vendas,
  estatisticasEstoque,
  onGoToStock,
  onGoToRecipes,
}: {
  dashboard: BusinessDashboard | null;
  materiais: BusinessMaterial[];
  servicos: BusinessService[];
  vendas: BusinessSale[];
  estatisticasEstoque: StockStats;
  onGoToStock: () => void;
  onGoToRecipes: () => void;
}) {
  const summary = dashboard?.summary;

  const servicosComMaiorLucro = [...servicos]
    .sort((a, b) => b.gross_profit - a.gross_profit)
    .slice(0, 4);

  const servicosComBaixaCapacidade = servicos.filter(
    (servico) =>
      servico.current_capacity !== null &&
      servico.current_capacity !== undefined &&
      servico.current_capacity <= 3,
  );

  const ticketMedio =
    vendas.length > 0
      ? vendas.reduce((total, venda) => total + venda.total_amount, 0) /
        vendas.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Entradas registradas"
          value={formatCurrency(summary?.total_sales ?? 0)}
          hint="Total vendido"
        />
        <MetricCard
          label="Custo consumido"
          value={formatCurrency(summary?.total_material_cost ?? 0)}
          hint="Materiais usados em vendas"
        />
        <MetricCard
          label="Lucro bruto"
          value={formatCurrency(summary?.gross_profit ?? 0)}
          hint={`${formatNumber(summary?.gross_margin_percent ?? 0)}% de margem`}
        />
        <MetricCard
          label="Valor em estoque"
          value={formatCurrency(estatisticasEstoque.valorEmEstoque)}
          hint={`${estatisticasEstoque.totalItens} materiais`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-stone-950">
                Painel inteligente
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Uma leitura rápida para saber se o negócio está pronto para vender.
              </p>
            </div>

            <Badge tone="success">
              {servicosComBaixaCapacidade.length === 0
                ? "Estoque saudável"
                : `${servicosComBaixaCapacidade.length} alerta(s)`}
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <HealthCard
              title="Ficha de custo"
              value={`${servicos.filter((servico) => servico.materials.length > 0).length}/${servicos.length}`}
              description="Serviços com materiais definidos"
              actionLabel="Ver fichas"
              onAction={onGoToRecipes}
            />
            <HealthCard
              title="Estoque crítico"
              value={`${estatisticasEstoque.materiaisBaixos.length}`}
              description="Itens com quantidade baixa"
              actionLabel="Ver estoque"
              onAction={onGoToStock}
            />
            <HealthCard
              title="Ticket médio"
              value={formatCurrency(ticketMedio)}
              description="Média por venda registrada"
            />
          </div>

          <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <h3 className="font-black text-emerald-950">
              Próxima melhor ação
            </h3>
            <p className="mt-2 texto-quebra text-sm text-emerald-800">
              {getNextActionMessage({
                materiais,
                servicos,
                vendasLength: vendas.length,
                servicosComBaixaCapacidade,
              })}
            </p>
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-xl font-black tracking-tight text-stone-950">
            Alertas rápidos
          </h2>

          <div className="mt-4 space-y-3">
            {estatisticasEstoque.materiaisBaixos.length === 0 &&
            servicosComBaixaCapacidade.length === 0 ? (
              <EmptyList message="Nenhum alerta crítico no momento." />
            ) : null}

            {estatisticasEstoque.materiaisBaixos.slice(0, 4).map((material) => (
              <AlertRow
                key={material.id}
                title={material.name}
                description={`Restam ${formatNumber(material.stock_quantity)} ${material.unit}`}
              />
            ))}

            {servicosComBaixaCapacidade.slice(0, 4).map((servico) => (
              <AlertRow
                key={servico.id}
                title={servico.name}
                description={`Capacidade atual: ${servico.current_capacity} venda(s)`}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <h2 className="text-xl font-black tracking-tight text-stone-950">
            Serviços mais lucrativos
          </h2>

          <div className="mt-4 space-y-3">
            {servicosComMaiorLucro.length === 0 ? (
              <EmptyList message="Nenhum serviço criado ainda." />
            ) : null}

            {servicosComMaiorLucro.map((service) => (
              <ServiceResumeCard key={service.id} service={service} />
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-xl font-black tracking-tight text-stone-950">
            Últimas vendas
          </h2>

          <div className="mt-4 space-y-3">
            {vendas.length === 0 ? (
              <EmptyList message="Nenhuma venda registrada ainda." />
            ) : null}

            {vendas.slice(0, 5).map((sale) => (
              <SaleCard key={sale.id} sale={sale} />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export function EstoqueTab({
  materiais,
  totalMateriais,
  categorias,
  busca,
  categoria,
  estatisticas,
  form,
  materialEmEdicaoId,
  saving,
  onBuscaChange,
  onCategoriaChange,
  onChange,
  onSubmit,
  onCancelEdit,
  onEdit,
  onDelete,
}: {
  materiais: BusinessMaterial[];
  totalMateriais: number;
  categorias: string[];
  busca: string;
  categoria: string;
  estatisticas: StockStats;
  form: MaterialFormState;
  materialEmEdicaoId: string | null;
  saving: boolean;
  onBuscaChange: (value: string) => void;
  onCategoriaChange: (value: string) => void;
  onChange: (form: MaterialFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onEdit: (material: BusinessMaterial) => void;
  onDelete: (material: BusinessMaterial) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Itens cadastrados"
          value={`${totalMateriais}`}
          hint="Materiais no estoque"
        />
        <MetricCard
          label="Valor em estoque"
          value={formatCurrency(estatisticas.valorEmEstoque)}
          hint="Quantidade atual x custo unitário"
        />
        <MetricCard
          label="Categorias"
          value={`${estatisticas.totalCategorias}`}
          hint="Organização do estoque"
        />
        <MetricCard
          label="Atenção"
          value={`${estatisticas.materiaisBaixos.length}`}
          hint="Itens com baixa quantidade"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-700">
                {materialEmEdicaoId ? "Editar material" : "Novo material"}
              </p>
              <h2 className="texto-quebra text-xl font-black tracking-tight text-stone-950">
                {materialEmEdicaoId
                  ? "Corrigir item do estoque"
                  : "Adicionar ao estoque"}
              </h2>
              <p className="mt-1 texto-quebra text-sm text-stone-500">
                Informe a quantidade comprada e o valor pago para calcular o custo unitário.
              </p>
            </div>

            {materialEmEdicaoId ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="shrink-0 rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <InputField
              label="Nome do material"
              value={form.name}
              onChange={(value) => onChange({ ...form, name: value })}
              placeholder="Ex: Progressiva 1L"
              required
            />

            <InputField
              label="Categoria"
              value={form.category}
              onChange={(value) => onChange({ ...form, category: value })}
              placeholder="Ex: Química, embalagem, ingrediente"
              required
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="Quantidade"
                value={form.stock_quantity}
                onChange={(value) =>
                  onChange({ ...form, stock_quantity: value })
                }
                placeholder="1000"
                inputMode="decimal"
                required
              />

              <SelectField
                label="Unidade"
                value={form.unit}
                onChange={(value) => onChange({ ...form, unit: value })}
                options={UNIDADES}
              />
            </div>

            <InputField
              label="Valor total pago"
              value={form.total_cost}
              onChange={(value) => onChange({ ...form, total_cost: value })}
              placeholder="120,00"
              inputMode="decimal"
              required
            />

            <div className="rounded-2xl bg-stone-50 p-4 text-sm">
              <p className="font-bold text-stone-900">
                Custo unitário estimado
              </p>
              <p className="mt-1 texto-quebra text-stone-600">
                {formatCurrency(
                  calculatePreviewUnitCost(
                    form.stock_quantity,
                    form.total_cost,
                  ),
                )}{" "}
                por {form.unit}
              </p>
            </div>

            <InputField
              label="Fornecedor"
              value={form.supplier}
              onChange={(value) => onChange({ ...form, supplier: value })}
              placeholder="Opcional"
            />

            <InputField
              label="Data da compra"
              type="date"
              value={form.purchase_date}
              onChange={(value) => onChange({ ...form, purchase_date: value })}
              required
            />

            <TextareaField
              label="Observação"
              value={form.notes}
              onChange={(value) => onChange({ ...form, notes: value })}
              placeholder="Opcional"
            />

            <PrimaryButton disabled={saving}>
              {saving
                ? "Salvando..."
                : materialEmEdicaoId
                  ? "Salvar correção"
                  : "Adicionar ao estoque"}
            </PrimaryButton>
          </form>
        </SectionCard>

        <SectionCard>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-stone-950">
                Estoque organizado
              </h2>
              <p className="mt-1 texto-quebra text-sm text-stone-500">
                Consulte, filtre, edite ou exclua materiais cadastrados.
              </p>
            </div>

            <Badge tone="neutral">
              {materiais.length} de {totalMateriais} item(ns)
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InputField
              label="Buscar material"
              value={busca}
              onChange={onBuscaChange}
              placeholder="Nome, categoria ou fornecedor"
            />

            <SelectField
              label="Categoria"
              value={categoria}
              onChange={onCategoriaChange}
              options={categorias}
            />
          </div>

          <div className="mt-5 space-y-3">
            {materiais.length === 0 ? (
              <EmptyList message="Nenhum material encontrado para os filtros atuais." />
            ) : null}

            {materiais.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export function ServicosTab({
  servicos,
  servicoForm,
  servicoEmEdicaoId,
  saving,
  onServiceChange,
  onServiceSubmit,
  onCancelServiceEdit,
  onEditService,
  onDeleteService,
  onManageRecipe,
}: {
  servicos: BusinessService[];
  servicoForm: ServiceFormState;
  servicoEmEdicaoId: string | null;
  saving: boolean;
  onServiceChange: (form: ServiceFormState) => void;
  onServiceSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelServiceEdit: () => void;
  onEditService: (service: BusinessService) => void;
  onDeleteService: (service: BusinessService) => void;
  onManageRecipe: (service: BusinessService) => void;
}) {
  const servicosComFicha = servicos.filter(
    (servico) => servico.materials.length > 0,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Serviços cadastrados"
          value={`${servicos.length}`}
          hint="Produtos ou serviços vendidos"
        />
        <MetricCard
          label="Com ficha de custo"
          value={`${servicosComFicha}`}
          hint="Serviços com materiais vinculados"
        />
        <MetricCard
          label="Pendentes de ficha"
          value={`${servicos.length - servicosComFicha}`}
          hint="Precisam de composição"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-700">
                {servicoEmEdicaoId ? "Editar serviço" : "Novo serviço"}
              </p>

              <h2 className="texto-quebra text-xl font-black tracking-tight text-stone-950">
                {servicoEmEdicaoId
                  ? "Corrigir serviço ou produto"
                  : "Criar serviço ou produto"}
              </h2>

              <p className="mt-1 texto-quebra text-sm text-stone-500">
                Cadastre somente o que você vende. A composição de materiais fica
                na aba Fichas de custo.
              </p>
            </div>

            {servicoEmEdicaoId ? (
              <button
                type="button"
                onClick={onCancelServiceEdit}
                className="shrink-0 rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <form onSubmit={onServiceSubmit} className="space-y-4">
            <InputField
              label="Nome"
              value={servicoForm.name}
              onChange={(value) =>
                onServiceChange({ ...servicoForm, name: value })
              }
              placeholder="Ex: Progressiva cabelo médio"
              required
            />

            <InputField
              label="Categoria"
              value={servicoForm.category}
              onChange={(value) =>
                onServiceChange({ ...servicoForm, category: value })
              }
              placeholder="Ex: Cabelo, marmita, bolo, instalação"
              required
            />

            <InputField
              label="Preço cobrado"
              value={servicoForm.price}
              onChange={(value) =>
                onServiceChange({ ...servicoForm, price: value })
              }
              placeholder="180,00"
              inputMode="decimal"
              required
            />

            <InputField
              label="Tempo estimado em minutos"
              value={servicoForm.estimated_minutes}
              onChange={(value) =>
                onServiceChange({
                  ...servicoForm,
                  estimated_minutes: value,
                })
              }
              placeholder="Opcional"
              inputMode="numeric"
            />

            <TextareaField
              label="Observação"
              value={servicoForm.notes}
              onChange={(value) =>
                onServiceChange({ ...servicoForm, notes: value })
              }
              placeholder="Opcional"
            />

            <PrimaryButton disabled={saving}>
              {saving
                ? "Salvando..."
                : servicoEmEdicaoId
                  ? "Salvar serviço"
                  : "Criar serviço"}
            </PrimaryButton>
          </form>
        </SectionCard>

        <SectionCard>
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight text-stone-950">
              Serviços cadastrados
            </h2>

            <p className="mt-1 texto-quebra text-sm text-stone-500">
              Esta lista mostra apenas os serviços/produtos. Para adicionar
              materiais usados, clique em Montar ficha.
            </p>
          </div>

          <div className="space-y-4">
            {servicos.length === 0 ? (
              <EmptyList message="Nenhum serviço criado ainda." />
            ) : null}

            {servicos.map((service) => (
              <ServiceDetailsCard
                key={service.id}
                service={service}
                onEditService={onEditService}
                onDeleteService={onDeleteService}
                onManageRecipe={onManageRecipe}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export function FichasTab({
  materiais,
  servicos,
  fichaForm,
  itemFichaEmEdicaoId,
  servicoSelecionadoParaFicha,
  saving,
  onRecipeChange,
  onRecipeSubmit,
  onCancelRecipeEdit,
  onEditRecipeItem,
  onDeleteRecipeItem,
  onGoToServices,
  onGoToStock,
}: {
  materiais: BusinessMaterial[];
  servicos: BusinessService[];
  fichaForm: RecipeFormState;
  itemFichaEmEdicaoId: string | null;
  servicoSelecionadoParaFicha: BusinessService | null;
  saving: boolean;
  onRecipeChange: (form: RecipeFormState) => void;
  onRecipeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelRecipeEdit: () => void;
  onEditRecipeItem: (
    service: BusinessService,
    item: BusinessRecipeItem,
  ) => void;
  onDeleteRecipeItem: (
    service: BusinessService,
    item: BusinessRecipeItem,
  ) => void;
  onGoToServices: () => void;
  onGoToStock: () => void;
}) {
  const servicosComRecipe = servicos.filter(
    (servico) => servico.materials.length > 0,
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
        <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
          Fichas de custo
        </p>

        <h2 className="mt-1 texto-quebra text-2xl font-black tracking-tight text-emerald-950">
          Materiais usados em cada serviço
        </h2>

        <p className="mt-2 max-w-3xl texto-quebra text-sm leading-6 text-emerald-800">
          Aqui você conecta o estoque aos serviços. O serviço continua aparecendo
          na aba Serviços, e a ficha mostra apenas os materiais consumidos em uma
          venda.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Serviços com ficha"
          value={`${servicosComRecipe}/${servicos.length}`}
          hint="Serviços com materiais vinculados"
        />
        <MetricCard
          label="Materiais disponíveis"
          value={`${materiais.length}`}
          hint="Itens cadastrados no estoque"
        />
        <MetricCard
          label="Ficha selecionada"
          value={servicoSelecionadoParaFicha ? servicoSelecionadoParaFicha.name : "Nenhuma"}
          hint="Escolha um serviço para montar a composição"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-700">
                {itemFichaEmEdicaoId ? "Editar item da ficha" : "Ficha de custo"}
              </p>

              <h2 className="texto-quebra text-xl font-black tracking-tight text-stone-950">
                Montar composição do serviço
              </h2>

              <p className="mt-1 texto-quebra text-sm text-stone-500">
                Escolha um serviço e informe quais materiais do estoque são
                consumidos em uma venda.
              </p>
            </div>

            {itemFichaEmEdicaoId ? (
              <button
                type="button"
                onClick={onCancelRecipeEdit}
                className="shrink-0 rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
              >
                Cancelar
              </button>
            ) : null}
          </div>

          {servicos.length === 0 ? (
            <div className="space-y-4">
              <EmptyList message="Crie um serviço antes de montar a ficha de custo." />

              <button
                type="button"
                onClick={onGoToServices}
                className="w-full rounded-2xl border border-emerald-200 px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
              >
                Ir para Serviços
              </button>
            </div>
          ) : materiais.length === 0 ? (
            <div className="space-y-4">
              <EmptyList message="Cadastre materiais no estoque antes de montar a ficha." />

              <button
                type="button"
                onClick={onGoToStock}
                className="w-full rounded-2xl border border-emerald-200 px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
              >
                Ir para Estoque
              </button>
            </div>
          ) : (
            <form onSubmit={onRecipeSubmit} className="space-y-4">
              <SelectField
                label="Serviço"
                value={fichaForm.service_id}
                onChange={(value) =>
                  onRecipeChange({ ...fichaForm, service_id: value })
                }
                options={servicos.map((servico) => ({
                  label: servico.name,
                  value: servico.id,
                }))}
                placeholder="Selecione um serviço"
              />

              <SelectField
                label="Material do estoque"
                value={fichaForm.material_id}
                onChange={(value) =>
                  onRecipeChange({ ...fichaForm, material_id: value })
                }
                options={materiais.map((material) => ({
                  label: `${material.name} (${formatNumber(
                    material.stock_quantity,
                  )} ${material.unit})`,
                  value: material.id,
                }))}
                placeholder="Selecione um material"
              />

              <InputField
                label="Quantidade usada por venda"
                value={fichaForm.quantity_used}
                onChange={(value) =>
                  onRecipeChange({ ...fichaForm, quantity_used: value })
                }
                placeholder="Ex: 80"
                inputMode="decimal"
                required
              />

              <PrimaryButton
                disabled={saving || !fichaForm.service_id || !fichaForm.material_id}
              >
                {saving
                  ? "Salvando..."
                  : itemFichaEmEdicaoId
                    ? "Salvar item da ficha"
                    : "Adicionar material à ficha"}
              </PrimaryButton>
            </form>
          )}
        </SectionCard>

        <SectionCard>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-stone-950">
                Ficha selecionada
              </h2>

              <p className="mt-1 texto-quebra text-sm text-stone-500">
                Esta área mostra somente os materiais vinculados ao serviço
                escolhido.
              </p>
            </div>

            {servicoSelecionadoParaFicha ? (
              <Badge
                tone={
                  servicoSelecionadoParaFicha.materials.length > 0
                    ? "success"
                    : "neutral"
                }
              >
                {servicoSelecionadoParaFicha.materials.length} item(ns)
              </Badge>
            ) : null}
          </div>

          {servicoSelecionadoParaFicha ? (
            <FichaResumo
              service={servicoSelecionadoParaFicha}
              onEditItem={onEditRecipeItem}
              onDeleteItem={onDeleteRecipeItem}
            />
          ) : (
            <EmptyList message="Selecione um serviço para visualizar ou montar a ficha." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export function VendasTab({
  vendas,
  servicos,
  form,
  servicoSelecionadoParaVenda,
  saving,
  onChange,
  onSubmit,
}: {
  vendas: BusinessSale[];
  servicos: BusinessService[];
  form: SaleFormState;
  servicoSelecionadoParaVenda: BusinessService | null;
  saving: boolean;
  onChange: (form: SaleFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard>
        <h2 className="text-xl font-black tracking-tight text-stone-950">
          Registrar venda
        </h2>
        <p className="mt-1 texto-quebra text-sm text-stone-500">
          Ao registrar, o sistema calcula lucro bruto e baixa o estoque usado na ficha.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <SelectField
            label="Serviço ou produto"
            value={form.service_id}
            onChange={(value) => {
              const service = servicos.find((item) => item.id === value);

              onChange({
                ...form,
                service_id: value,
                unit_price: service ? String(service.price) : form.unit_price,
              });
            }}
            options={servicos.map((servico) => ({
              label: servico.name,
              value: servico.id,
            }))}
            placeholder="Selecione um serviço"
          />

          <InputField
            label="Quantidade vendida"
            value={form.quantity}
            onChange={(value) => onChange({ ...form, quantity: value })}
            inputMode="numeric"
            required
          />

          <InputField
            label="Preço unitário"
            value={form.unit_price}
            onChange={(value) => onChange({ ...form, unit_price: value })}
            placeholder={
              servicoSelecionadoParaVenda
                ? formatCurrency(servicoSelecionadoParaVenda.price)
                : "Opcional"
            }
            inputMode="decimal"
          />

          <InputField
            label="Data da venda"
            type="date"
            value={form.sale_date}
            onChange={(value) => onChange({ ...form, sale_date: value })}
            required
          />

          <SelectField
            label="Forma de pagamento"
            value={form.payment_method}
            onChange={(value) => onChange({ ...form, payment_method: value })}
            options={FORMAS_PAGAMENTO}
          />

          <TextareaField
            label="Observação"
            value={form.notes}
            onChange={(value) => onChange({ ...form, notes: value })}
            placeholder="Opcional"
          />

          <PrimaryButton disabled={saving || !servicos.length}>
            {saving ? "Registrando..." : "Registrar venda"}
          </PrimaryButton>
        </form>

        {servicoSelecionadoParaVenda ? (
          <div className="mt-5 rounded-3xl border border-stone-200 bg-stone-50 p-4 text-sm">
            <p className="font-black text-stone-900">Prévia da venda</p>
            <div className="mt-3 grid gap-2">
              <InfoLine
                label="Custo material por unidade"
                value={formatCurrency(servicoSelecionadoParaVenda.material_cost)}
              />
              <InfoLine
                label="Lucro estimado por unidade"
                value={formatCurrency(servicoSelecionadoParaVenda.gross_profit)}
              />
              <InfoLine
                label="Capacidade atual"
                value={
                  servicoSelecionadoParaVenda.current_capacity === null ||
                  servicoSelecionadoParaVenda.current_capacity === undefined
                    ? "-"
                    : `${servicoSelecionadoParaVenda.current_capacity} venda(s)`
                }
              />
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard>
        <h2 className="text-xl font-black tracking-tight text-stone-950">
          Histórico de vendas
        </h2>

        <div className="mt-4 space-y-3">
          {vendas.length === 0 ? (
            <EmptyList message="Nenhuma venda registrada ainda." />
          ) : null}

          {vendas.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
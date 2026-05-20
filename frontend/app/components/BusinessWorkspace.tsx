"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BUSINESS_NAVIGATION_EVENT,
  type BusinessNavigationPayload,
  consumeBusinessNavigationPayload,
  dispatchBusinessCreated,
} from "@/app/lib/business-navigation";
import {
  addMaterialToService,
  createBusiness,
  createBusinessMaterial,
  createBusinessSale,
  createBusinessService,
  deleteBusinessMaterial,
  getBusinessDashboard,
  listBusinessMaterials,
  listBusinesses,
  listBusinessSales,
  listBusinessServices,
  updateBusinessMaterial,
} from "@/app/lib/business-api";
import type {
  Business,
  BusinessDashboard,
  BusinessMaterial,
  BusinessSale,
  BusinessService,
} from "@/app/types/business";

type BusinessTab = "resumo" | "estoque" | "servicos" | "vendas";

type BusinessFormState = {
  name: string;
  type: string;
  description: string;
};

type MaterialFormState = {
  name: string;
  category: string;
  stock_quantity: string;
  unit: string;
  total_cost: string;
  supplier: string;
  purchase_date: string;
  notes: string;
};

type ServiceFormState = {
  name: string;
  category: string;
  price: string;
  estimated_minutes: string;
  notes: string;
};

type RecipeFormState = {
  service_id: string;
  material_id: string;
  quantity_used: string;
};

type SaleFormState = {
  service_id: string;
  quantity: string;
  unit_price: string;
  sale_date: string;
  payment_method: string;
  notes: string;
};

const TIPOS_NEGOCIO = [
  "Beleza",
  "Alimentação",
  "Loja",
  "Serviços",
  "Artesanato",
  "Construção",
  "Outro",
];

const UNIDADES = [
  "unidade",
  "ml",
  "litro",
  "g",
  "kg",
  "m",
  "cm",
  "caixa",
  "pacote",
];

const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
];

const hoje = new Date().toISOString().slice(0, 10);

const negocioInicial: BusinessFormState = {
  name: "",
  type: "Outro",
  description: "",
};

const materialInicial: MaterialFormState = {
  name: "",
  category: "Matéria-prima",
  stock_quantity: "",
  unit: "unidade",
  total_cost: "",
  supplier: "",
  purchase_date: hoje,
  notes: "",
};

const servicoInicial: ServiceFormState = {
  name: "",
  category: "Serviço",
  price: "",
  estimated_minutes: "",
  notes: "",
};

const fichaInicial: RecipeFormState = {
  service_id: "",
  material_id: "",
  quantity_used: "",
};

const vendaInicial: SaleFormState = {
  service_id: "",
  quantity: "1",
  unit_price: "",
  sale_date: hoje,
  payment_method: "Pix",
  notes: "",
};

export default function BusinessWorkspace() {
  const [negocios, setNegocios] = useState<Business[]>([]);
  const [negocioSelecionadoId, setNegocioSelecionadoId] = useState<string | null>(
    null,
  );

  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [materiais, setMateriais] = useState<BusinessMaterial[]>([]);
  const [servicos, setServicos] = useState<BusinessService[]>([]);
  const [vendas, setVendas] = useState<BusinessSale[]>([]);

  const [abaAtiva, setAbaAtiva] = useState<BusinessTab>("resumo");
  const [criandoNegocio, setCriandoNegocio] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [negocioForm, setNegocioForm] = useState<BusinessFormState>(
    negocioInicial,
  );

  const [materialForm, setMaterialForm] = useState<MaterialFormState>(
    materialInicial,
  );
  const [materialEmEdicaoId, setMaterialEmEdicaoId] = useState<string | null>(
    null,
  );

  const [servicoForm, setServicoForm] = useState<ServiceFormState>(
    servicoInicial,
  );
  const [fichaForm, setFichaForm] = useState<RecipeFormState>(fichaInicial);
  const [vendaForm, setVendaForm] = useState<SaleFormState>(vendaInicial);

  const [buscaEstoque, setBuscaEstoque] = useState("");
  const [categoriaEstoque, setCategoriaEstoque] = useState("Todas");

  const negocioSelecionado = useMemo(
    () =>
      negocios.find((negocio) => negocio.id === negocioSelecionadoId) ?? null,
    [negocios, negocioSelecionadoId],
  );

  const categoriasEstoque = useMemo(() => {
    const categorias = materiais.map((material) => material.category);

    return ["Todas", ...Array.from(new Set(categorias)).sort()];
  }, [materiais]);

  const materiaisFiltrados = useMemo(() => {
    return materiais.filter((material) => {
      const busca = buscaEstoque.trim().toLowerCase();

      const correspondeBusca =
        !busca ||
        material.name.toLowerCase().includes(busca) ||
        material.category.toLowerCase().includes(busca) ||
        material.supplier?.toLowerCase().includes(busca);

      const correspondeCategoria =
        categoriaEstoque === "Todas" || material.category === categoriaEstoque;

      return correspondeBusca && correspondeCategoria;
    });
  }, [materiais, buscaEstoque, categoriaEstoque]);

  const servicoSelecionadoParaFicha = useMemo(
    () => servicos.find((servico) => servico.id === fichaForm.service_id) ?? null,
    [servicos, fichaForm.service_id],
  );

  const servicoSelecionadoParaVenda = useMemo(
    () => servicos.find((servico) => servico.id === vendaForm.service_id) ?? null,
    [servicos, vendaForm.service_id],
  );

  const estatisticasEstoque = useMemo(() => {
    const valorEmEstoque = materiais.reduce((total, material) => {
      return total + material.stock_quantity * material.unit_cost;
    }, 0);

    const materiaisBaixos = materiais.filter(
      (material) => material.stock_quantity <= 3,
    );

    const categorias = new Set(materiais.map((material) => material.category));

    return {
      totalItens: materiais.length,
      valorEmEstoque,
      materiaisBaixos,
      totalCategorias: categorias.size,
    };
  }, [materiais]);

  useEffect(() => {
    carregarNegocios();
  }, []);

  useEffect(() => {
    if (!negocioSelecionadoId) {
      return;
    }

    carregarDadosDoNegocio(negocioSelecionadoId);
  }, [negocioSelecionadoId]);

  useEffect(() => {
    function applyNavigationPayload(payload: BusinessNavigationPayload | null) {
      if (!payload) {
        return;
      }

      if (payload.mode === "create") {
        setCriandoNegocio(true);
        setNegocioSelecionadoId(null);
        setErro(null);
        setSucesso(null);
        return;
      }

      if (payload.mode === "select" && payload.businessId) {
        setNegocioSelecionadoId(payload.businessId);
        setCriandoNegocio(false);
        setAbaAtiva("resumo");
        setErro(null);
        setSucesso(null);
      }
    }

    applyNavigationPayload(consumeBusinessNavigationPayload());

    function handleBusinessNavigation(event: Event) {
      const customEvent = event as CustomEvent<BusinessNavigationPayload>;
      applyNavigationPayload(customEvent.detail);
    }

    window.addEventListener(BUSINESS_NAVIGATION_EVENT, handleBusinessNavigation);

    return () => {
      window.removeEventListener(
        BUSINESS_NAVIGATION_EVENT,
        handleBusinessNavigation,
      );
    };
  }, []);

  async function carregarNegocios() {
    try {
      setCarregando(true);
      setErro(null);

      const negociosCarregados = await listBusinesses();

      setNegocios(negociosCarregados);

      if (negociosCarregados.length > 0) {
        setNegocioSelecionadoId(
          (valorAtual) => valorAtual ?? negociosCarregados[0].id,
        );
        setCriandoNegocio(false);
      } else {
        setCriandoNegocio(true);
      }
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setCarregando(false);
    }
  }

  async function carregarDadosDoNegocio(businessId: string) {
    try {
      setErro(null);

      const [
        dashboardCarregado,
        materiaisCarregados,
        servicosCarregados,
        vendasCarregadas,
      ] = await Promise.all([
        getBusinessDashboard(businessId),
        listBusinessMaterials(businessId),
        listBusinessServices(businessId),
        listBusinessSales(businessId),
      ]);

      setDashboard(dashboardCarregado);
      setMateriais(materiaisCarregados);
      setServicos(servicosCarregados);
      setVendas(vendasCarregadas);

      setFichaForm((formAtual) => ({
        ...formAtual,
        service_id: formAtual.service_id || servicosCarregados[0]?.id || "",
        material_id: formAtual.material_id || materiaisCarregados[0]?.id || "",
      }));

      setVendaForm((formAtual) => ({
        ...formAtual,
        service_id: formAtual.service_id || servicosCarregados[0]?.id || "",
      }));
    } catch (error) {
      setErro(getErrorMessage(error));
    }
  }

  async function atualizarNegocioSelecionado() {
    if (!negocioSelecionadoId) {
      return;
    }

    await carregarDadosDoNegocio(negocioSelecionadoId);
  }

  async function handleCriarNegocio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!negocioForm.name.trim()) {
      setErro("Informe o nome do negócio.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const novoNegocio = await createBusiness({
        name: negocioForm.name,
        type: negocioForm.type,
        description: negocioForm.description || null,
      });

      setNegocios((listaAtual) => [novoNegocio, ...listaAtual]);
      setNegocioSelecionadoId(novoNegocio.id);
      setNegocioForm(negocioInicial);
      setCriandoNegocio(false);
      setAbaAtiva("resumo");
      setSucesso("Negócio criado com sucesso.");
      dispatchBusinessCreated(novoNegocio.id);
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!negocioSelecionadoId) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const payload = {
        name: materialForm.name,
        category: materialForm.category,
        stock_quantity: toNumber(materialForm.stock_quantity),
        unit: materialForm.unit,
        total_cost: toNumber(materialForm.total_cost),
        supplier: materialForm.supplier || null,
        purchase_date: materialForm.purchase_date,
        notes: materialForm.notes || null,
      };

      if (materialEmEdicaoId) {
        await updateBusinessMaterial(
          negocioSelecionadoId,
          materialEmEdicaoId,
          payload,
        );
        setSucesso("Material atualizado com sucesso.");
      } else {
        await createBusinessMaterial(negocioSelecionadoId, payload);
        setSucesso("Material cadastrado com sucesso.");
      }

      limparFormularioMaterial();
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirMaterial(material: BusinessMaterial) {
    if (!negocioSelecionadoId) {
      return;
    }

    const confirmou = window.confirm(
      `Excluir "${material.name}" do estoque? Se ele estiver em alguma ficha de custo, essa ligação também será removida.`,
    );

    if (!confirmou) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      await deleteBusinessMaterial(negocioSelecionadoId, material.id);

      if (materialEmEdicaoId === material.id) {
        limparFormularioMaterial();
      }

      setSucesso("Material excluído do estoque.");
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicaoMaterial(material: BusinessMaterial) {
    setMaterialEmEdicaoId(material.id);
    setMaterialForm({
      name: material.name,
      category: material.category,
      stock_quantity: String(material.stock_quantity).replace(".", ","),
      unit: material.unit,
      total_cost: String(material.total_cost).replace(".", ","),
      supplier: material.supplier ?? "",
      purchase_date: material.purchase_date,
      notes: material.notes ?? "",
    });
    setAbaAtiva("estoque");
    setErro(null);
    setSucesso(null);
  }

  function limparFormularioMaterial() {
    setMaterialEmEdicaoId(null);
    setMaterialForm(materialInicial);
  }

  async function handleCriarServico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!negocioSelecionadoId) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      await createBusinessService(negocioSelecionadoId, {
        name: servicoForm.name,
        category: servicoForm.category,
        price: toNumber(servicoForm.price),
        estimated_minutes: servicoForm.estimated_minutes
          ? Number(servicoForm.estimated_minutes)
          : null,
        notes: servicoForm.notes || null,
      });

      setServicoForm(servicoInicial);
      setSucesso("Serviço ou produto criado com sucesso.");
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleAdicionarMaterialNaFicha(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!negocioSelecionadoId) {
      return;
    }

    if (!fichaForm.service_id || !fichaForm.material_id) {
      setErro("Selecione um serviço e um material.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      await addMaterialToService(negocioSelecionadoId, fichaForm.service_id, {
        material_id: fichaForm.material_id,
        quantity_used: toNumber(fichaForm.quantity_used),
      });

      setFichaForm((formAtual) => ({
        ...formAtual,
        quantity_used: "",
      }));

      setSucesso("Material adicionado à ficha de custo.");
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleRegistrarVenda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!negocioSelecionadoId) {
      return;
    }

    if (!vendaForm.service_id) {
      setErro("Selecione um serviço ou produto.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      await createBusinessSale(negocioSelecionadoId, {
        service_id: vendaForm.service_id,
        quantity: Number(vendaForm.quantity),
        unit_price: vendaForm.unit_price ? toNumber(vendaForm.unit_price) : null,
        sale_date: vendaForm.sale_date,
        payment_method: vendaForm.payment_method,
        notes: vendaForm.notes || null,
      });

      setVendaForm(vendaInicial);
      setSucesso("Venda registrada e estoque atualizado.");
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="space-y-6">
      {erro ? (
        <AlertMessage
          type="error"
          message={erro}
          onClose={() => setErro(null)}
        />
      ) : null}

      {sucesso ? (
        <AlertMessage
          type="success"
          message={sucesso}
          onClose={() => setSucesso(null)}
        />
      ) : null}

      {criandoNegocio ? (
        <CreateBusinessCard
          form={negocioForm}
          saving={salvando}
          onChange={setNegocioForm}
          onSubmit={handleCriarNegocio}
        />
      ) : null}

      {!criandoNegocio && negocioSelecionado ? (
        <div className="space-y-6">
          <BusinessHeader
            business={negocioSelecionado}
            stats={{
              materiais: materiais.length,
              servicos: servicos.length,
              vendas: vendas.length,
            }}
          />

          <TabNavigation activeTab={abaAtiva} onChange={setAbaAtiva} />

          {abaAtiva === "resumo" ? (
            <ResumoTab
              dashboard={dashboard}
              materiais={materiais}
              servicos={servicos}
              vendas={vendas}
              estatisticasEstoque={estatisticasEstoque}
              onGoToStock={() => setAbaAtiva("estoque")}
              onGoToServices={() => setAbaAtiva("servicos")}
            />
          ) : null}

          {abaAtiva === "estoque" ? (
            <EstoqueTab
              materiais={materiaisFiltrados}
              totalMateriais={materiais.length}
              categorias={categoriasEstoque}
              busca={buscaEstoque}
              categoria={categoriaEstoque}
              estatisticas={estatisticasEstoque}
              form={materialForm}
              materialEmEdicaoId={materialEmEdicaoId}
              saving={salvando}
              onBuscaChange={setBuscaEstoque}
              onCategoriaChange={setCategoriaEstoque}
              onChange={setMaterialForm}
              onSubmit={handleSalvarMaterial}
              onCancelEdit={limparFormularioMaterial}
              onEdit={iniciarEdicaoMaterial}
              onDelete={handleExcluirMaterial}
            />
          ) : null}

          {abaAtiva === "servicos" ? (
            <ServicosTab
              materiais={materiais}
              servicos={servicos}
              servicoForm={servicoForm}
              fichaForm={fichaForm}
              servicoSelecionadoParaFicha={servicoSelecionadoParaFicha}
              saving={salvando}
              onServiceChange={setServicoForm}
              onRecipeChange={setFichaForm}
              onServiceSubmit={handleCriarServico}
              onRecipeSubmit={handleAdicionarMaterialNaFicha}
            />
          ) : null}

          {abaAtiva === "vendas" ? (
            <VendasTab
              vendas={vendas}
              servicos={servicos}
              form={vendaForm}
              servicoSelecionadoParaVenda={servicoSelecionadoParaVenda}
              saving={salvando}
              onChange={setVendaForm}
              onSubmit={handleRegistrarVenda}
            />
          ) : null}
        </div>
      ) : null}

      {!criandoNegocio && !negocioSelecionado && !carregando ? (
        <EmptyBusinessState onCreate={() => setCriandoNegocio(true)} />
      ) : null}
    </section>
  );
}

function CreateBusinessCard({
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
        <p className="text-sm font-bold text-emerald-700">
          Novo negócio
        </p>
        <h1 className="text-2xl font-black tracking-tight text-stone-950">
          Crie uma área para controlar custos, estoque, serviços e vendas
        </h1>
        <p className="mt-2 text-sm text-stone-500">
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

function BusinessHeader({
  business,
  stats,
}: {
  business: Business;
  stats: {
    materiais: number;
    servicos: number;
    vendas: number;
  };
}) {
  return (
    <header className="overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-800 p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-100">
            {business.type}
          </p>
          <h1 className="mt-2 texto-quebra text-3xl font-black tracking-tight">
            {business.name}
          </h1>
          {business.description ? (
            <p className="mt-2 max-w-3xl texto-quebra text-sm text-emerald-50">
              {business.description}
            </p>
          ) : (
            <p className="mt-2 max-w-3xl text-sm text-emerald-50">
              Controle inteligente de estoque, fichas de custo e lucro bruto.
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white/10 p-2 backdrop-blur">
          <HeaderMiniStat label="Estoque" value={stats.materiais} />
          <HeaderMiniStat label="Serviços" value={stats.servicos} />
          <HeaderMiniStat label="Vendas" value={stats.vendas} />
        </div>
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
    <div className="min-w-20 rounded-2xl bg-white/10 px-4 py-3 text-center">
      <p className="text-lg font-black">{value}</p>
      <p className="text-xs font-semibold text-emerald-50">{label}</p>
    </div>
  );
}

function TabNavigation({
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
      label: "Serviços e fichas",
      description: "Custo por venda",
    },
    {
      id: "vendas",
      label: "Vendas",
      description: "Entradas e baixa",
    },
  ];

  return (
    <nav className="grid gap-3 md:grid-cols-4">
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

function ResumoTab({
  dashboard,
  materiais,
  servicos,
  vendas,
  estatisticasEstoque,
  onGoToStock,
  onGoToServices,
}: {
  dashboard: BusinessDashboard | null;
  materiais: BusinessMaterial[];
  servicos: BusinessService[];
  vendas: BusinessSale[];
  estatisticasEstoque: {
    totalItens: number;
    valorEmEstoque: number;
    materiaisBaixos: BusinessMaterial[];
    totalCategorias: number;
  };
  onGoToStock: () => void;
  onGoToServices: () => void;
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

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-stone-950">
                Painel inteligente
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Uma leitura rápida para saber se o negócio está organizado para vender.
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
              onAction={onGoToServices}
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
            <p className="mt-2 text-sm text-emerald-800">
              {getNextActionMessage({
                materiais,
                servicos,
                vendas,
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

function EstoqueTab({
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
  estatisticas: {
    totalItens: number;
    valorEmEstoque: number;
    materiaisBaixos: BusinessMaterial[];
    totalCategorias: number;
  };
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
          hint="Quantidade atual × custo unitário"
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

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <SectionCard>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-700">
                {materialEmEdicaoId ? "Editar material" : "Novo material"}
              </p>
              <h2 className="texto-quebra text-xl font-black tracking-tight text-stone-950">
                {materialEmEdicaoId ? "Corrigir item do estoque" : "Adicionar ao estoque"}
              </h2>
              <p className="mt-1 text-sm text-stone-500">
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

            <div className="grid grid-cols-2 gap-3">
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
              <p className="mt-1 text-sm text-stone-500">
                Consulte, filtre, edite ou exclua materiais cadastrados.
              </p>
            </div>

            <Badge tone="neutral">
              {materiais.length} de {totalMateriais} item(ns)
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
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

function ServicosTab({
  materiais,
  servicos,
  servicoForm,
  fichaForm,
  servicoSelecionadoParaFicha,
  saving,
  onServiceChange,
  onRecipeChange,
  onServiceSubmit,
  onRecipeSubmit,
}: {
  materiais: BusinessMaterial[];
  servicos: BusinessService[];
  servicoForm: ServiceFormState;
  fichaForm: RecipeFormState;
  servicoSelecionadoParaFicha: BusinessService | null;
  saving: boolean;
  onServiceChange: (form: ServiceFormState) => void;
  onRecipeChange: (form: RecipeFormState) => void;
  onServiceSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRecipeSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <SectionCard>
          <h2 className="text-xl font-black tracking-tight text-stone-950">
            Criar serviço ou produto
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Cadastre o que você vende. Depois monte a ficha com os materiais usados.
          </p>

          <form onSubmit={onServiceSubmit} className="mt-5 space-y-4">
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
              {saving ? "Salvando..." : "Criar serviço"}
            </PrimaryButton>
          </form>
        </SectionCard>

        <SectionCard>
          <h2 className="text-xl font-black tracking-tight text-stone-950">
            Ficha de custo inteligente
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Informe quanto de cada material é consumido em uma venda.
          </p>

          <form onSubmit={onRecipeSubmit} className="mt-5 space-y-4">
            <SelectField
              label="Serviço ou produto"
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
              label="Material"
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

            <PrimaryButton disabled={saving || !servicos.length || !materiais.length}>
              {saving ? "Adicionando..." : "Adicionar à ficha"}
            </PrimaryButton>
          </form>

          {servicoSelecionadoParaFicha ? (
            <FichaResumo service={servicoSelecionadoParaFicha} />
          ) : null}
        </SectionCard>
      </div>

      <SectionCard>
        <h2 className="text-xl font-black tracking-tight text-stone-950">
          Serviços cadastrados
        </h2>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {servicos.length === 0 ? (
            <EmptyList message="Nenhum serviço criado ainda." />
          ) : null}

          {servicos.map((service) => (
            <ServiceDetailsCard key={service.id} service={service} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function VendasTab({
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
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <SectionCard>
        <h2 className="text-xl font-black tracking-tight text-stone-950">
          Registrar venda
        </h2>
        <p className="mt-1 text-sm text-stone-500">
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
            <p className="font-black text-stone-900">
              Prévia da venda
            </p>
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

function FichaResumo({ service }: { service: BusinessService }) {
  return (
    <div className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="texto-quebra font-black text-stone-950">
            Ficha atual: {service.name}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Custo total: {formatCurrency(service.material_cost)} • Lucro bruto:{" "}
            {formatCurrency(service.gross_profit)}
          </p>
        </div>

        <Badge tone="neutral">
          {service.current_capacity === null ||
          service.current_capacity === undefined
            ? "Sem capacidade"
            : `${service.current_capacity} venda(s)`}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {service.materials.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum material adicionado ainda.
          </p>
        ) : null}

        {service.materials.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="texto-quebra font-bold text-stone-800">
                {item.material_name}
              </p>
              <p className="text-stone-500">
                {formatNumber(item.quantity_used)} {item.unit} ×{" "}
                {formatCurrency(item.unit_cost)}
              </p>
            </div>
            <p className="shrink-0 font-black text-stone-950">
              {formatCurrency(item.total_cost)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="truncate text-sm font-bold text-stone-500">
        {label}
      </p>
      <p className="mt-2 texto-quebra text-2xl font-black tracking-tight text-stone-950">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 texto-quebra text-xs font-semibold text-stone-400">
          {hint}
        </p>
      ) : null}
    </article>
  );
}

function HealthCard({
  title,
  value,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  value: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 bg-white p-4">
      <p className="truncate text-sm font-bold text-stone-500">{title}</p>
      <p className="mt-2 texto-quebra text-2xl font-black text-stone-950">
        {value}
      </p>
      <p className="mt-1 texto-quebra text-xs text-stone-500">{description}</p>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-stone-700"
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}

function MaterialCard({
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

            {isLowStock ? (
              <Badge tone="danger">Estoque baixo</Badge>
            ) : null}
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

function ServiceResumeCard({ service }: { service: BusinessService }) {
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
            service.current_capacity === null || service.current_capacity === undefined
              ? "-"
              : `${service.current_capacity}x`
          }
        />
      </div>
    </article>
  );
}

function ServiceDetailsCard({ service }: { service: BusinessService }) {
  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.2em] text-stone-400">
            {service.category}
          </p>
          <h3 className="mt-1 texto-quebra text-lg font-black text-stone-950">
            {service.name}
          </h3>
        </div>

        <span className="shrink-0 rounded-full bg-stone-900 px-3 py-1 text-sm font-black text-white">
          {formatCurrency(service.price)}
        </span>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <InfoLine label="Materiais" value={formatCurrency(service.material_cost)} />
        <InfoLine label="Lucro bruto" value={formatCurrency(service.gross_profit)} />
        <InfoLine label="Margem" value={`${formatNumber(service.gross_margin_percent)}%`} />
        <InfoLine
          label="Dá para fazer"
          value={
            service.current_capacity === null || service.current_capacity === undefined
              ? "-"
              : `${service.current_capacity}x`
          }
        />
      </div>

      <div className="mt-4 space-y-2">
        {service.materials.length === 0 ? (
          <p className="rounded-2xl bg-stone-50 p-3 text-sm text-stone-500">
            Ficha de custo ainda não montada.
          </p>
        ) : null}

        {service.materials.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="texto-quebra font-bold text-stone-800">
                {item.material_name}
              </p>
              <p className="text-stone-500">
                Usa {formatNumber(item.quantity_used)} {item.unit}
              </p>
            </div>

            <p className="shrink-0 font-black text-stone-950">
              {formatCurrency(item.total_cost)}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function SaleCard({ sale }: { sale: BusinessSale }) {
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
        <InfoLine label="Materiais" value={formatCurrency(sale.total_material_cost)} />
        <InfoLine label="Lucro" value={formatCurrency(sale.gross_profit)} />
        <InfoLine label="Margem" value={`${formatNumber(sale.gross_margin_percent)}%`} />
      </div>
    </article>
  );
}

function AlertRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="texto-quebra font-black text-amber-950">{title}</p>
      <p className="mt-1 texto-quebra text-sm text-amber-800">{description}</p>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-black uppercase tracking-wide text-stone-400">
        {label}
      </p>
      <p className="texto-quebra font-bold text-stone-800">
        {value}
      </p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "decimal" | "numeric";
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-sm font-bold text-stone-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required={required}
        className="w-full min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-stone-300 focus:border-emerald-600"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-sm font-bold text-stone-700">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full min-w-0 resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-stone-300 focus:border-emerald-600"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { label: string; value: string }>;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-sm font-bold text-stone-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600"
      >
        {placeholder ? (
          <option value="">
            {placeholder}
          </option>
        ) : null}

        {options.map((option) => {
          const normalizedOption =
            typeof option === "string"
              ? { label: option, value: option }
              : option;

          return (
            <option key={normalizedOption.value} value={normalizedOption.value}>
              {normalizedOption.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function PrimaryButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function AlertMessage({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`mb-4 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <span className="texto-quebra">{message}</span>
      <button type="button" onClick={onClose} className="shrink-0">
        Fechar
      </button>
    </div>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
      {message}
    </div>
  );
}

function EmptyBusinessState({ onCreate }: { onCreate: () => void }) {
  return (
    <SectionCard>
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
          Meus Negócios
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950">
          Crie seu primeiro negócio
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500">
          Controle materiais, fichas de custo, vendas, lucro bruto e capacidade
          de produção por serviço ou produto.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
        >
          Criar novo negócio
        </button>
      </div>
    </SectionCard>
  );
}

function SectionCard({ children }: { children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      {children}
    </section>
  );
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "danger" | "neutral";
}) {
  const classNameByTone = {
    success: "bg-emerald-100 text-emerald-800",
    danger: "bg-red-100 text-red-700",
    neutral: "bg-stone-100 text-stone-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${classNameByTone[tone]}`}
    >
      {children}
    </span>
  );
}

function getNextActionMessage({
  materiais,
  servicos,
  vendas,
  servicosComBaixaCapacidade,
}: {
  materiais: BusinessMaterial[];
  servicos: BusinessService[];
  vendas: BusinessSale[];
  servicosComBaixaCapacidade: BusinessService[];
}) {
  if (materiais.length === 0) {
    return "Cadastre seus primeiros materiais no estoque. Sem estoque, o sistema não consegue calcular custo por serviço.";
  }

  if (servicos.length === 0) {
    return "Crie seu primeiro serviço ou produto. Depois conecte os materiais usados na ficha de custo.";
  }

  if (servicos.some((servico) => servico.materials.length === 0)) {
    return "Existem serviços sem ficha de custo. Monte a ficha para o sistema calcular lucro e capacidade corretamente.";
  }

  if (servicosComBaixaCapacidade.length > 0) {
    return "Alguns serviços estão com baixa capacidade de venda por falta de material. Revise o estoque antes de vender mais.";
  }

  if (vendas.length === 0) {
    return "Registre sua primeira venda para o sistema baixar estoque automaticamente e mostrar lucro real.";
  }

  return "Seu fluxo principal está configurado. Continue registrando vendas para acompanhar lucro, estoque e serviços mais rentáveis.";
}

function calculatePreviewUnitCost(quantity: string, totalCost: string): number {
  const quantityNumber = toNumber(quantity);
  const totalCostNumber = toNumber(totalCost);

  if (quantityNumber <= 0 || totalCostNumber <= 0) {
    return 0;
  }

  return totalCostNumber / quantityNumber;
}

function toNumber(value: string): number {
  const normalizedValue = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numberValue = Number(normalizedValue);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}
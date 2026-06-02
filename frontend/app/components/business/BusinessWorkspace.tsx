"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue";
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
  deleteBusiness,
  deleteBusinessMaterial,
  deleteBusinessService,
  deleteServiceMaterial,
  getBusinessDashboard,
  listBusinessMaterials,
  listBusinesses,
  listBusinessSales,
  listBusinessServices,
  updateBusiness,
  updateBusinessMaterial,
  updateBusinessService,
  updateServiceMaterial,
} from "@/app/lib/business-api";
import type {
  Business,
  BusinessDashboard,
  BusinessMaterial,
  BusinessRecipeItem,
  BusinessSale,
  BusinessService,
} from "@/app/types/business";
import { smartScrollToRef } from "@/app/utils/smartScroll";

import { BusinessHeader } from "./BusinessHeader";
import { DeleteBusinessModal, EditBusinessModal } from "./BusinessModals";
import {
  CreateBusinessCard,
  EstoqueTab,
  FichasTab,
  ResumoTab,
  ServicosTab,
  TabNavigation,
  VendasTab,
} from "./BusinessTabs";
import {
  fichaInicial,
  materialInicial,
  negocioInicial,
  servicoInicial,
  vendaInicial,
} from "./businessConstants";
import type {
  BusinessFormState,
  BusinessTab,
  DeleteBusinessMode,
  MaterialFormState,
  RecipeFormState,
  SaleFormState,
  ServiceFormState,
} from "./businessTypes";
import { AlertMessage, EmptyBusinessState } from "./BusinessShared";
import {
  dispatchBusinessRefresh,
  getErrorMessage,
  toNumber,
} from "./businessUtils";

const BUSINESS_OFFLINE_MESSAGE =
  "Você está offline. Os dados já carregados continuam disponíveis para consulta, mas para criar, editar ou excluir informações é necessário conectar à internet.";

export default function BusinessWorkspace() {
  const isOnline = useOnlineStatus();

  const createBusinessSectionRef = useRef<HTMLDivElement | null>(null);
  const businessContentSectionRef = useRef<HTMLDivElement | null>(null);
  const stockSectionRef = useRef<HTMLDivElement | null>(null);
  const servicesSectionRef = useRef<HTMLDivElement | null>(null);
  const recipesSectionRef = useRef<HTMLDivElement | null>(null);
  const salesSectionRef = useRef<HTMLDivElement | null>(null);

  const [negocios, setNegocios] = useState<Business[]>([]);
  const [negocioSelecionadoId, setNegocioSelecionadoId] = useState<
    string | null
  >(null);

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

  const [negocioForm, setNegocioForm] =
    useState<BusinessFormState>(negocioInicial);
  const [editandoNegocio, setEditandoNegocio] = useState(false);
  const [negocioEdicaoForm, setNegocioEdicaoForm] =
    useState<BusinessFormState>(negocioInicial);

  const [deleteBusinessModalOpen, setDeleteBusinessModalOpen] = useState(false);
  const [deleteBusinessMode, setDeleteBusinessMode] =
    useState<DeleteBusinessMode>("password");
  const [deletePassword, setDeletePassword] = useState("");

  const [materialForm, setMaterialForm] =
    useState<MaterialFormState>(materialInicial);
  const [materialEmEdicaoId, setMaterialEmEdicaoId] = useState<string | null>(
    null,
  );

  const [servicoForm, setServicoForm] =
    useState<ServiceFormState>(servicoInicial);
  const [servicoEmEdicaoId, setServicoEmEdicaoId] = useState<string | null>(
    null,
  );

  const [fichaForm, setFichaForm] = useState<RecipeFormState>(fichaInicial);
  const [itemFichaEmEdicaoId, setItemFichaEmEdicaoId] = useState<string | null>(
    null,
  );

  const [vendaForm, setVendaForm] = useState<SaleFormState>(vendaInicial);
  const [buscaEstoque, setBuscaEstoque] = useState("");
  const buscaEstoqueDebounced = useDebouncedValue(buscaEstoque);
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
      const busca = buscaEstoqueDebounced.trim().toLowerCase();

      const correspondeBusca =
        !busca ||
        material.name.toLowerCase().includes(busca) ||
        material.category.toLowerCase().includes(busca) ||
        material.supplier?.toLowerCase().includes(busca);

      const correspondeCategoria =
        categoriaEstoque === "Todas" || material.category === categoriaEstoque;

      return correspondeBusca && correspondeCategoria;
    });
  }, [materiais, buscaEstoqueDebounced, categoriaEstoque]);

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

  const openCreateBusinessSection = useCallback(() => {
    setCriandoNegocio(true);
    setNegocioSelecionadoId(null);
    setErro(null);
    setSucesso(null);

    smartScrollToRef(createBusinessSectionRef, {
      delayMs: 120,
      focusFirstField: true,
    });
  }, []);

  const carregarDadosDoNegocio = useCallback(
    async (businessId: string) => {
      if (!isOnline) {
        setErro(BUSINESS_OFFLINE_MESSAGE);
        return;
      }

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
    },
    [isOnline],
  );

  const carregarNegocios = useCallback(async () => {
    if (!isOnline) {
      setCarregando(false);
      setErro(BUSINESS_OFFLINE_MESSAGE);
      return;
    }

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
        setNegocioSelecionadoId(null);
        setCriandoNegocio(true);
      }
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setCarregando(false);
    }
  }, [isOnline]);

  const atualizarNegocioSelecionado = useCallback(async () => {
    if (!negocioSelecionadoId) {
      return;
    }

    await carregarDadosDoNegocio(negocioSelecionadoId);
  }, [carregarDadosDoNegocio, negocioSelecionadoId]);

  useEffect(() => {
    void carregarNegocios();
  }, [carregarNegocios]);

  useEffect(() => {
    if (!negocioSelecionadoId) {
      return;
    }

    void carregarDadosDoNegocio(negocioSelecionadoId);
  }, [carregarDadosDoNegocio, negocioSelecionadoId]);

  useEffect(() => {
    if (isOnline && erro === BUSINESS_OFFLINE_MESSAGE) {
      setErro(null);
    }
  }, [erro, isOnline]);

  useEffect(() => {
    function applyNavigationPayload(payload: BusinessNavigationPayload | null) {
      if (!payload) {
        return;
      }

      if (payload.mode === "create") {
        if (!isOnline) {
          setErro("Você está offline. Conecte-se para criar um negócio.");
          setSucesso(null);
          return;
        }

        openCreateBusinessSection();
        return;
      }

      if (payload.mode === "select" && payload.businessId) {
        setNegocioSelecionadoId(payload.businessId);
        setCriandoNegocio(false);
        setAbaAtiva("resumo");
        setErro(null);
        setSucesso(null);

        smartScrollToRef(businessContentSectionRef, {
          delayMs: 120,
        });
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
  }, [isOnline, openCreateBusinessSection]);

  function blockOfflineAction(actionDescription: string) {
    if (isOnline) {
      return false;
    }

    setErro(`Você está offline. Conecte-se para ${actionDescription}.`);
    setSucesso(null);

    return true;
  }

  function getTabSectionRef(tab: BusinessTab) {
    const refs = {
      resumo: businessContentSectionRef,
      estoque: stockSectionRef,
      servicos: servicesSectionRef,
      fichas: recipesSectionRef,
      vendas: salesSectionRef,
    };

    return refs[tab];
  }

  function scrollToBusinessSection(tab: BusinessTab, focusFirstField = false) {
    smartScrollToRef(getTabSectionRef(tab), {
      delayMs: 120,
      focusFirstField,
    });
  }

  function handleTabChange(tab: BusinessTab) {
    setAbaAtiva(tab);
    setErro(null);
    setSucesso(null);
    scrollToBusinessSection(tab, tab !== "resumo");
  }

  async function handleCriarNegocio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (blockOfflineAction("criar um negócio")) {
      return;
    }

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

      smartScrollToRef(businessContentSectionRef, {
        delayMs: 160,
      });
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleEditarNegocio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (blockOfflineAction("editar este negócio")) {
      return;
    }

    if (!negocioSelecionadoId) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const negocioAtualizado = await updateBusiness(negocioSelecionadoId, {
        name: negocioEdicaoForm.name,
        type: negocioEdicaoForm.type,
        description: negocioEdicaoForm.description || null,
      });

      setNegocios((listaAtual) =>
        listaAtual.map((negocio) =>
          negocio.id === negocioAtualizado.id ? negocioAtualizado : negocio,
        ),
      );

      setEditandoNegocio(false);
      setSucesso("Negócio atualizado com sucesso.");
      dispatchBusinessRefresh();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function excluirNegocio(payload: {
    password?: string | null;
    google_credential?: string | null;
  }) {
    if (blockOfflineAction("excluir este negócio")) {
      return;
    }

    if (!negocioSelecionadoId) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      await deleteBusiness(negocioSelecionadoId, payload);

      const negociosAtualizados = await listBusinesses();

      setNegocios(negociosAtualizados);
      setDeleteBusinessModalOpen(false);
      setDeletePassword("");
      dispatchBusinessRefresh();

      if (negociosAtualizados.length > 0) {
        setNegocioSelecionadoId(negociosAtualizados[0].id);
        setCriandoNegocio(false);
      } else {
        setNegocioSelecionadoId(null);
        setCriandoNegocio(true);
      }

      setSucesso("Negócio excluído com segurança.");
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirNegocioComSenha(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await excluirNegocio({
      password: deletePassword,
      google_credential: null,
    });
  }

  async function handleExcluirNegocioComGoogleCredential(credential: string) {
    await excluirNegocio({
      password: null,
      google_credential: credential,
    });
  }

  async function handleSalvarMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (blockOfflineAction("salvar material no estoque")) {
      return;
    }

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
    if (blockOfflineAction("excluir material do estoque")) {
      return;
    }

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

  async function handleSalvarServico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (blockOfflineAction("salvar serviço ou produto")) {
      return;
    }

    if (!negocioSelecionadoId) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const payload = {
        name: servicoForm.name,
        category: servicoForm.category,
        price: toNumber(servicoForm.price),
        estimated_minutes: servicoForm.estimated_minutes
          ? Number(servicoForm.estimated_minutes)
          : null,
        notes: servicoForm.notes || null,
      };

      if (servicoEmEdicaoId) {
        await updateBusinessService(
          negocioSelecionadoId,
          servicoEmEdicaoId,
          payload,
        );
        setSucesso("Serviço atualizado com sucesso.");
      } else {
        await createBusinessService(negocioSelecionadoId, payload);
        setSucesso("Serviço ou produto criado com sucesso.");
      }

      limparFormularioServico();
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirServico(service: BusinessService) {
    if (blockOfflineAction("excluir serviço ou produto")) {
      return;
    }

    if (!negocioSelecionadoId) {
      return;
    }

    const confirmou = window.confirm(
      `Excluir "${service.name}"? As fichas ligadas a esse serviço também serão removidas.`,
    );

    if (!confirmou) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      await deleteBusinessService(negocioSelecionadoId, service.id);

      if (servicoEmEdicaoId === service.id) {
        limparFormularioServico();
      }

      setSucesso("Serviço excluído com sucesso.");
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarItemFicha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (blockOfflineAction("salvar item da ficha de custo")) {
      return;
    }

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

      if (itemFichaEmEdicaoId) {
        await updateServiceMaterial(
          negocioSelecionadoId,
          fichaForm.service_id,
          itemFichaEmEdicaoId,
          {
            quantity_used: toNumber(fichaForm.quantity_used),
          },
        );
        setSucesso("Item da ficha atualizado com sucesso.");
      } else {
        await addMaterialToService(negocioSelecionadoId, fichaForm.service_id, {
          material_id: fichaForm.material_id,
          quantity_used: toNumber(fichaForm.quantity_used),
        });
        setSucesso("Material adicionado à ficha de custo.");
      }

      limparFormularioFicha();
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirItemFicha(
    service: BusinessService,
    item: BusinessRecipeItem,
  ) {
    if (blockOfflineAction("remover item da ficha de custo")) {
      return;
    }

    if (!negocioSelecionadoId) {
      return;
    }

    const confirmou = window.confirm(
      `Remover "${item.material_name}" da ficha de "${service.name}"?`,
    );

    if (!confirmou) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      await deleteServiceMaterial(negocioSelecionadoId, service.id, item.id);

      if (itemFichaEmEdicaoId === item.id) {
        limparFormularioFicha();
      }

      setSucesso("Item removido da ficha de custo.");
      await atualizarNegocioSelecionado();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function handleRegistrarVenda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (blockOfflineAction("registrar uma venda")) {
      return;
    }

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

  function abrirEdicaoNegocio() {
    if (blockOfflineAction("editar este negócio")) {
      return;
    }

    if (!negocioSelecionado) {
      return;
    }

    setNegocioEdicaoForm({
      name: negocioSelecionado.name,
      type: negocioSelecionado.type,
      description: negocioSelecionado.description ?? "",
    });
    setEditandoNegocio(true);
  }

  function abrirExclusaoNegocio() {
    if (blockOfflineAction("excluir este negócio")) {
      return;
    }

    setDeleteBusinessModalOpen(true);
  }

  function iniciarEdicaoMaterial(material: BusinessMaterial) {
    if (blockOfflineAction("editar material do estoque")) {
      return;
    }

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
    scrollToBusinessSection("estoque", true);
  }

  function iniciarEdicaoServico(service: BusinessService) {
    if (blockOfflineAction("editar serviço ou produto")) {
      return;
    }

    setServicoEmEdicaoId(service.id);
    setServicoForm({
      name: service.name,
      category: service.category,
      price: String(service.price).replace(".", ","),
      estimated_minutes: service.estimated_minutes
        ? String(service.estimated_minutes)
        : "",
      notes: service.notes ?? "",
    });
    setAbaAtiva("servicos");
    setErro(null);
    setSucesso(null);
    scrollToBusinessSection("servicos", true);
  }

  function iniciarEdicaoItemFicha(
    service: BusinessService,
    item: BusinessRecipeItem,
  ) {
    if (blockOfflineAction("editar item da ficha de custo")) {
      return;
    }

    setItemFichaEmEdicaoId(item.id);
    setFichaForm({
      service_id: service.id,
      material_id: item.material_id,
      quantity_used: String(item.quantity_used).replace(".", ","),
    });
    setAbaAtiva("fichas");
    setErro(null);
    setSucesso(null);
    scrollToBusinessSection("fichas", true);
  }

  function abrirFichaDoServico(service: BusinessService) {
    setFichaForm((formAtual) => ({
      ...formAtual,
      service_id: service.id,
      material_id: formAtual.material_id || materiais[0]?.id || "",
    }));
    setAbaAtiva("fichas");
    setErro(null);
    setSucesso(null);
    scrollToBusinessSection("fichas", true);
  }

  function limparFormularioMaterial() {
    setMaterialEmEdicaoId(null);
    setMaterialForm(materialInicial);
  }

  function limparFormularioServico() {
    setServicoEmEdicaoId(null);
    setServicoForm(servicoInicial);
  }

  function limparFormularioFicha() {
    setItemFichaEmEdicaoId(null);
    setFichaForm((formAtual) => ({
      ...formAtual,
      quantity_used: "",
    }));
  }

  return (
    <section className="space-y-6">
      {!isOnline ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm sm:px-5">
          Você está offline. A área de negócios fica disponível para consulta
          quando já tiver dados carregados, mas alterações precisam de internet.
        </section>
      ) : null}

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
        <div ref={createBusinessSectionRef} className="scroll-mt-5">
          <CreateBusinessCard
            form={negocioForm}
            saving={salvando}
            onChange={setNegocioForm}
            onSubmit={handleCriarNegocio}
          />
        </div>
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
            onEdit={abrirEdicaoNegocio}
            onDelete={abrirExclusaoNegocio}
          />

          <TabNavigation activeTab={abaAtiva} onChange={handleTabChange} />

          {abaAtiva === "resumo" ? (
            <div ref={businessContentSectionRef} className="scroll-mt-5">
              <ResumoTab
                dashboard={dashboard}
                materiais={materiais}
                servicos={servicos}
                vendas={vendas}
                estatisticasEstoque={estatisticasEstoque}
                onGoToStock={() => handleTabChange("estoque")}
                onGoToRecipes={() => handleTabChange("fichas")}
              />
            </div>
          ) : null}

          {abaAtiva === "estoque" ? (
            <div ref={stockSectionRef} className="scroll-mt-5">
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
            </div>
          ) : null}

          {abaAtiva === "servicos" ? (
            <div ref={servicesSectionRef} className="scroll-mt-5">
              <ServicosTab
                servicos={servicos}
                servicoForm={servicoForm}
                servicoEmEdicaoId={servicoEmEdicaoId}
                saving={salvando}
                onServiceChange={setServicoForm}
                onServiceSubmit={handleSalvarServico}
                onCancelServiceEdit={limparFormularioServico}
                onEditService={iniciarEdicaoServico}
                onDeleteService={handleExcluirServico}
                onManageRecipe={abrirFichaDoServico}
              />
            </div>
          ) : null}

          {abaAtiva === "fichas" ? (
            <div ref={recipesSectionRef} className="scroll-mt-5">
              <FichasTab
                materiais={materiais}
                servicos={servicos}
                fichaForm={fichaForm}
                itemFichaEmEdicaoId={itemFichaEmEdicaoId}
                servicoSelecionadoParaFicha={servicoSelecionadoParaFicha}
                saving={salvando}
                onRecipeChange={setFichaForm}
                onRecipeSubmit={handleSalvarItemFicha}
                onCancelRecipeEdit={limparFormularioFicha}
                onEditRecipeItem={iniciarEdicaoItemFicha}
                onDeleteRecipeItem={handleExcluirItemFicha}
                onGoToServices={() => handleTabChange("servicos")}
                onGoToStock={() => handleTabChange("estoque")}
              />
            </div>
          ) : null}

          {abaAtiva === "vendas" ? (
            <div ref={salesSectionRef} className="scroll-mt-5">
              <VendasTab
                vendas={vendas}
                servicos={servicos}
                form={vendaForm}
                servicoSelecionadoParaVenda={servicoSelecionadoParaVenda}
                saving={salvando}
                onChange={setVendaForm}
                onSubmit={handleRegistrarVenda}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {!criandoNegocio && !negocioSelecionado && !carregando ? (
        <EmptyBusinessState
          onCreate={() => {
            if (blockOfflineAction("criar um negócio")) {
              return;
            }

            openCreateBusinessSection();
          }}
        />
      ) : null}

      {editandoNegocio ? (
        <EditBusinessModal
          form={negocioEdicaoForm}
          saving={salvando}
          onChange={setNegocioEdicaoForm}
          onClose={() => setEditandoNegocio(false)}
          onSubmit={handleEditarNegocio}
        />
      ) : null}

      {deleteBusinessModalOpen && negocioSelecionado ? (
        <DeleteBusinessModal
          businessName={negocioSelecionado.name}
          mode={deleteBusinessMode}
          password={deletePassword}
          saving={salvando}
          googleEnabled={Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)}
          onModeChange={setDeleteBusinessMode}
          onPasswordChange={setDeletePassword}
          onClose={() => {
            setDeleteBusinessModalOpen(false);
            setDeletePassword("");
          }}
          onSubmitPassword={handleExcluirNegocioComSenha}
          onGoogleCredential={handleExcluirNegocioComGoogleCredential}
        />
      ) : null}
    </section>
  );
}

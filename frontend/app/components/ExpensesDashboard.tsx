"use client";

import type { FormEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreditCardDeleteModal } from "./CreditCardDeleteModal";

import { EXPENSE_CATEGORIES } from "../constants/categories";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import {
  dismissDailyReviewCard,
  getDailyReviewEnabled,
  markDailyReviewClosed,
  markPurposeOnboardingAsSeen,
  shouldShowDailyReviewCard,
  shouldShowPurposeOnboarding,
  subscribeToDailyReviewSettings,
  wasDailyReviewClosed,
  wasDailyReviewCardDismissed,
} from "../lib/daily-review";

import {
  readDashboardCache,
  saveDashboardCache,
} from "../lib/dashboard-cache";

import {
  createCreditCard,
  createExpense,
  createExpenseCategory,
  createIncome,
  deleteCreditCard,
  deleteExpense,
  deleteExpenseCategory,
  deleteIncome,
  getCreditCards,
  getExpenseCategories,
  getExpenses,
  getIncomes,
  updateCreditCard,
  updateExpense,
  updateExpenseCategory,
  updateIncome,
} from "../lib/api";
import type { User } from "../types/auth";
import type { ExpenseCategory } from "../types/category";
import type { CreateCreditCardRequest, CreditCard } from "../types/credit-card";
import type {
  CreateExpenseRequest,
  Expense,
  PaymentMethod,
} from "../types/expense";
import type { CreateIncomeRequest, Income } from "../types/income";
import type { CategoryTotal } from "../types/summary";
import {
  buildDailyReviewExpensePayload,
  buildQuickExpensePayload,
  calculateTodayExpenseTotal,
  getMonthlyInsightMessage,
  getTopExpenseCategories,
} from "../utils/dailyReview";
import {
  formatCurrency,
  getCurrentDate,
  getCurrentMonth,
  parseMoneyToNumber,
  sanitizeMoneyInput,
} from "../utils/formatters";
import { smartScrollToRef } from "../utils/smartScroll";
import { AppShell } from "./AppShell";
import { AddActionSheet } from "./AddActionSheet";
import BusinessWorkspace from "./BusinessWorkspace";
import { CategoryManagerModal } from "./CategoryManagerModal";
import { CollapsibleSection } from "./CollapsibleSection";
import { ConfirmModal } from "./ConfirmModal";
import { CreditCardsView } from "./CreditCardsView";
import { DailyReviewCard } from "./DailyReviewCard";
import { DailyReviewSheet } from "./DailyReviewSheet";
import { ExpenseFilters } from "./ExpenseFilters";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";
import {
  MoneyDestinationCard,
  MonthlyPurposeSummary,
  PurposeOnboarding,
  QuickActionsCard,
  TodayStatusCard,
} from "./FinancePurposeCards";
import { IncomesView } from "./IncomesView";
import {
  CachedDataNotice,
  MobileDashboardSkeleton,
  OfflineStatusBanner,
  UpcomingInvoicesStrip,
} from "./MobileReadyPolish";
import { QuickAddExpenseSheet } from "./QuickAddExpenseSheet";
import { ReportsView } from "./ReportsView";
import SettingsPage from "./settings/SettingsPage";
import type { AppView } from "./Sidebar";
import { SummaryCards } from "./SummaryCards";
import { Toast } from "./Toast";

type ExpensesDashboardProps = {
  currentUser: User;
  onLogout: () => void;
};

type ConfirmationState = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "danger" | "default";
  onConfirm: () => Promise<void> | void;
};

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

export function ExpensesDashboard({
  currentUser,
  onLogout,
}: ExpensesDashboardProps) {
  const expenseFormSectionRef = useRef<HTMLDivElement | null>(null);
  const expenseFiltersSectionRef = useRef<HTMLDivElement | null>(null);

  const isOnline = useOnlineStatus();
  
  const [activeView, setActiveView] = useState<AppView>("expenses");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categoryRecords, setCategoryRecords] = useState<ExpenseCategory[]>(
    () => createLocalDefaultCategories()
  );

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null
  );
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null
  );
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [creditCardDeletion, setCreditCardDeletion] =
  useState<CreditCardDeletionState | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonth());
  const [selectedReportMonth, setSelectedReportMonth] = useState(() =>
    getCurrentMonth()
  );
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(() => getCurrentDate());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [creditCardId, setCreditCardId] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("1");

  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingIncomes, setIsLoadingIncomes] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [categoryManagerError, setCategoryManagerError] = useState("");
  const [cardManagerError, setCardManagerError] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isAddActionSheetOpen, setIsAddActionSheetOpen] = useState(false);
  const [isQuickExpenseSheetOpen, setIsQuickExpenseSheetOpen] = useState(false);
  const [isDailyReviewSheetOpen, setIsDailyReviewSheetOpen] = useState(false);
  const [quickExpenseError, setQuickExpenseError] = useState("");
  const [dailyReviewError, setDailyReviewError] = useState("");
  const [isSavingQuickExpense, setIsSavingQuickExpense] = useState(false);
  const [isSavingDailyReview, setIsSavingDailyReview] = useState(false);
  const [didSaveQuickExpense, setDidSaveQuickExpense] = useState(false);
  const [didSaveDailyReview, setDidSaveDailyReview] = useState(false);
  const [isDailyReviewEnabled, setIsDailyReviewEnabled] = useState(() =>
    getDailyReviewEnabled(currentUser.id)
  );
  const [dailyReviewDismissedDate, setDailyReviewDismissedDate] = useState<
    string | null
  >(null);
  const [dailyReviewClosedDate, setDailyReviewClosedDate] = useState<
    string | null
  >(null);
  const [isPurposeOnboardingVisible, setIsPurposeOnboardingVisible] =
    useState(false);
  const [creditCardFormAutoOpenToken, setCreditCardFormAutoOpenToken] =
    useState<number | null>(null);
  const shouldReturnToExpenseAfterCardCreateRef = useRef(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(
    null
  );
  const [toast, setToast] = useState<ToastState | null>(null);
  const [cachedDashboardSavedAt, setCachedDashboardSavedAt] = useState<
    string | null
  >(null);
  const [hasHydratedDashboardCache, setHasHydratedDashboardCache] =
    useState(false);
  const isEditing = editingExpenseId !== null;
  const todayDate = getCurrentDate();

  const categoryNames = useMemo(() => {
    return mergeCategoryNames(categoryRecords.map((item) => item.name));
  }, [categoryRecords]);

  const todayExpenseTotal = useMemo(() => {
    return calculateTodayExpenseTotal(expenses, todayDate);
  }, [expenses, todayDate]);

  const isTodayClosed = dailyReviewClosedDate === todayDate;

  const shouldDisplayDailyReviewCard = useMemo(() => {
    return shouldShowDailyReviewCard({
      expenses,
      today: todayDate,
      currentHour: new Date().getHours(),
      isEnabled: isDailyReviewEnabled,
      isDismissed:
        isTodayClosed ||
        dailyReviewDismissedDate === todayDate ||
        wasDailyReviewCardDismissed(currentUser.id, todayDate),
    });
  }, [
    currentUser.id,
    dailyReviewDismissedDate,
    expenses,
    isDailyReviewEnabled,
    isTodayClosed,
    todayDate,
  ]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    setIsDailyReviewEnabled(getDailyReviewEnabled(currentUser.id));
    setDailyReviewDismissedDate(
      wasDailyReviewCardDismissed(currentUser.id, todayDate) ? todayDate : null
    );
    setDailyReviewClosedDate(
      wasDailyReviewClosed(currentUser.id, todayDate) ? todayDate : null
    );
    setIsPurposeOnboardingVisible(shouldShowPurposeOnboarding(currentUser.id));

    return subscribeToDailyReviewSettings(() => {
      setIsDailyReviewEnabled(getDailyReviewEnabled(currentUser.id));
    });
  }, [currentUser.id, todayDate]);

  useEffect(() => {
    if (categoryNames.length > 0 && !categoryNames.includes(category)) {
      setCategory(categoryNames[0]);
    }

    if (
      selectedCategory !== "Todas" &&
      !categoryNames.includes(selectedCategory)
    ) {
      setSelectedCategory("Todas");
    }
  }, [category, categoryNames, selectedCategory]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getExpenseCategories();

      setCategoryRecords(data);
    } catch (error) {
      console.error(error);
      setCategoryRecords(createLocalDefaultCategories());
    }
  }, []);

  const loadCreditCards = useCallback(async () => {
    try {
      setIsLoadingCards(true);

      const data = await getCreditCards();

      setCreditCards(data);
    } catch (error) {
      console.error(error);
      setCardManagerError(
        getDashboardErrorMessage(error, "Não foi possível carregar os cartões.")
      );
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      setIsLoadingExpenses(true);
      setErrorMessage("");

      const data = await getExpenses();

      setExpenses(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        getDashboardErrorMessage(error, "Não foi possível carregar os gastos.")
      );
    } finally {
      setIsLoadingExpenses(false);
    }
  }, []);

  const loadIncomes = useCallback(async () => {
    try {
      setIsLoadingIncomes(true);

      const data = await getIncomes();

      setIncomes(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        getDashboardErrorMessage(error, "Não foi possível carregar os ganhos.")
      );
    } finally {
      setIsLoadingIncomes(false);
    }
  }, []);

  useEffect(() => {
    const cachedDashboard = readDashboardCache();

    if (!cachedDashboard) {
      setHasHydratedDashboardCache(true);
      return;
    }

    setExpenses(cachedDashboard.expenses);
    setIncomes(cachedDashboard.incomes);
    setCreditCards(cachedDashboard.creditCards);

    if (cachedDashboard.categoryRecords.length > 0) {
      setCategoryRecords(cachedDashboard.categoryRecords);
    }

    setCachedDashboardSavedAt(cachedDashboard.savedAt);
    setHasHydratedDashboardCache(true);
  }, []);

  useEffect(() => {
    void loadCategories();
    void loadCreditCards();
    void loadExpenses();
    void loadIncomes();
  }, [loadCategories, loadCreditCards, loadExpenses, loadIncomes]);

  useEffect(() => {
    if (!hasHydratedDashboardCache) {
      return;
    }

    if (isLoadingExpenses || isLoadingIncomes || isLoadingCards) {
      return;
    }

    saveDashboardCache({
      expenses,
      incomes,
      creditCards,
      categoryRecords,
    });

    if (typeof navigator !== "undefined" && navigator.onLine) {
      setCachedDashboardSavedAt(null);
    }
  }, [
    categoryRecords,
    creditCards,
    expenses,
    hasHydratedDashboardCache,
    incomes,
    isLoadingCards,
    isLoadingExpenses,
    isLoadingIncomes,
  ]);

  const monthlyExpenses = useMemo(() => {
    return expenses.filter((expense) => expense.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const monthlyIncomes = useMemo(() => {
    return incomes.filter((income) => income.date.startsWith(selectedMonth));
  }, [incomes, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return monthlyExpenses.filter((expense) => {
      const matchesCategory =
        selectedCategory === "Todas" || expense.category === selectedCategory;

      const matchesDescription =
        normalizedSearch.length === 0 ||
        expense.description.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesDescription;
    });
  }, [monthlyExpenses, selectedCategory, searchTerm]);

  const monthlyExpenseTotal = useMemo(() => {
    return monthlyExpenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );
  }, [monthlyExpenses]);

  const monthlyIncomeTotal = useMemo(() => {
    return monthlyIncomes.reduce((total, income) => total + income.amount, 0);
  }, [monthlyIncomes]);

  const monthlyBalance = monthlyIncomeTotal - monthlyExpenseTotal;

  const topMonthlyCategories = useMemo(() => {
    return getTopExpenseCategories(monthlyExpenses, 3);
  }, [monthlyExpenses]);

  const monthlyInsightMessage = useMemo(() => {
    return getMonthlyInsightMessage(monthlyExpenses);
  }, [monthlyExpenses]);

  const filteredExpenseTotal = useMemo(() => {
    return filteredExpenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );
  }, [filteredExpenses]);

  const categoryTotals = useMemo<CategoryTotal[]>(() => {
    const totals = filteredExpenses.reduce<Record<string, number>>(
      (accumulator, expense) => {
        accumulator[expense.category] =
          (accumulator[expense.category] || 0) + expense.amount;

        return accumulator;
      },
      {}
    );

    return Object.entries(totals)
      .map(([categoryName, total]) => ({
        category: categoryName,
        total,
      }))
      .sort((first, second) => second.total - first.total);
  }, [filteredExpenses]);

  async function handleCreateIncome(incomeData: CreateIncomeRequest) {
    const createdIncome = await createIncome(incomeData);

    setIncomes((currentIncomes) => [createdIncome, ...currentIncomes]);
    showSuccessToast("Ganho cadastrado com sucesso.");
  }

  async function handleUpdateIncome(
    incomeId: string,
    incomeData: CreateIncomeRequest
  ) {
    const updatedIncome = await updateIncome(incomeId, incomeData);

    setIncomes((currentIncomes) =>
      currentIncomes.map((income) =>
        income.id === updatedIncome.id ? updatedIncome : income
      )
    );

    showSuccessToast("Ganho atualizado com sucesso.");
  }

  async function handleDeleteIncome(incomeId: string) {
    await deleteIncome(incomeId);

    setIncomes((currentIncomes) =>
      currentIncomes.filter((income) => income.id !== incomeId)
    );

    showSuccessToast("Ganho removido.");
  }

  function handleAmountChange(value: string) {
    setAmount(sanitizeMoneyInput(value));
  }

  function handlePaymentMethodChange(value: PaymentMethod) {
    setPaymentMethod(value);

    if (value !== "credit_card") {
      setCreditCardId("");
      setInstallmentsCount("1");
    }
  }

  function handleManageCardsClick() {
    setCardManagerError("");
    setActiveView("credit-cards");
  }

  function handleRegisterCreditCardFromExpense() {
    shouldReturnToExpenseAfterCardCreateRef.current = true;
    setCardManagerError("");
    setActiveView("credit-cards");
    setCreditCardFormAutoOpenToken(Date.now());
  }

  function handleInstallmentsCountChange(value: string) {
    setInstallmentsCount(value.replace(/\D/g, "").slice(0, 2) || "1");
  }

  function handleNewExpenseClick() {
    setIsAddActionSheetOpen(true);
  }

  function handleFullExpenseClick() {
    resetForm();
    setIsFormOpen(true);
    setActiveView("expenses");

    smartScrollToRef(expenseFormSectionRef, {
      delayMs: 120,
      focusFirstField: true,
    });
  }

  function handleAddActionSelect(action: "quick" | "full" | "daily-review") {
    setIsAddActionSheetOpen(false);

    if (action === "quick") {
      openQuickExpenseSheet();
      return;
    }

    if (action === "daily-review") {
      openDailyReviewSheet();
      return;
    }

    handleFullExpenseClick();
  }

  function openQuickExpenseSheet() {
    setQuickExpenseError("");
    setDidSaveQuickExpense(false);
    setIsQuickExpenseSheetOpen(true);
  }

  function openDailyReviewSheet() {
    setDailyReviewError("");
    setDidSaveDailyReview(false);
    setIsDailyReviewSheetOpen(true);
  }

  function handleViewMonthlySummary() {
    setActiveView("reports");
  }

  function handleDismissPurposeOnboarding() {
    markPurposeOnboardingAsSeen(currentUser.id);
    setIsPurposeOnboardingVisible(false);
  }

  async function handleCreateCreditCard(cardData: CreateCreditCardRequest) {
    if (blockOfflineAction("cadastrar um cartão")) {
      return false;
    }    
    
    try {
      setIsSavingCard(true);
      setCardManagerError("");

      const createdCard = await createCreditCard(cardData);
      const shouldReturnToExpense =
        shouldReturnToExpenseAfterCardCreateRef.current;

      setCreditCards((currentCards) => [createdCard, ...currentCards]);
      setCreditCardId(createdCard.id);

      if (shouldReturnToExpense) {
        shouldReturnToExpenseAfterCardCreateRef.current = false;
        setPaymentMethod("credit_card");
        setIsFormOpen(true);
        setActiveView("expenses");

        smartScrollToRef(expenseFormSectionRef, {
          delayMs: 180,
          focusFirstField: false,
        });

        showSuccessToast("Cartão cadastrado. Continue seu gasto no crédito.");
      } else {
        showSuccessToast("Cartão cadastrado com sucesso.");
      }

      return true;
    } catch (error) {
      console.error(error);
      setCardManagerError(
        getDashboardErrorMessage(error, "Não foi possível cadastrar o cartão.")
      );
      return false;
    } finally {
      setIsSavingCard(false);
    }
  }

  async function handleUpdateCreditCard(
    cardId: string,
    cardData: CreateCreditCardRequest,
  ) {
    if (blockOfflineAction("editar este cartão")) {
      return false;
    }
    try {
      setIsSavingCard(true);
      setCardManagerError("");

      const updatedCard = await updateCreditCard(cardId, cardData);

      setCreditCards((currentCards) =>
        currentCards.map((card) =>
          card.id === updatedCard.id ? updatedCard : card,
        ),
      );

      setExpenses((currentExpenses) =>
        currentExpenses.map((expense) => {
          if (expense.credit_card_id !== updatedCard.id) {
            return expense;
          }

          return {
            ...expense,
            credit_card: {
              id: updatedCard.id,
              name: updatedCard.name,
              brand: updatedCard.brand,
              last_four_digits: updatedCard.last_four_digits,
              color: updatedCard.color,
              due_day: updatedCard.due_day,
              is_deleted: false,
            },
          };
        }),
      );

      showSuccessToast("Cartão atualizado com sucesso.");

      return true;
    } catch (error) {
      console.error(error);
      setCardManagerError(
        getDashboardErrorMessage(error, "Não foi possível editar o cartão."),
      );
      return false;
    } finally {
      setIsSavingCard(false);
    }
  }

  function requestDeleteCreditCard(card: CreditCard) {
    if (blockOfflineAction("excluir este cartão")) {
      return;
    }

    const linkedExpensesCount = expenses.filter(
      (expense) => expense.credit_card_id === card.id,
    ).length;

    setCardManagerError("");
    setCreditCardDeletion({
      card,
      linkedExpensesCount,
    });
  }

  async function removeCreditCard(deleteLinkedExpenses: boolean) {
    if (!creditCardDeletion) {
      return;
    }
    if (blockOfflineAction("excluir este cartão")) {
      return;
    }
    const { card } = creditCardDeletion;

    try {
      setDeletingCardId(card.id);
      setCardManagerError("");

      await deleteCreditCard(card.id, {
        deleteLinkedExpenses,
      });

      setCreditCards((currentCards) =>
        currentCards.filter((currentCard) => currentCard.id !== card.id),
      );

      if (deleteLinkedExpenses) {
        setExpenses((currentExpenses) =>
          currentExpenses.filter((expense) => expense.credit_card_id !== card.id),
        );

        showSuccessToast("Cartão e lançamentos removidos.");
      } else {
        setExpenses((currentExpenses) =>
          markExpensesCreditCardAsDeleted(currentExpenses, card),
        );

        showSuccessToast("Cartão removido. Lançamentos mantidos no histórico.");
      }

      if (creditCardId === card.id) {
        setCreditCardId("");
      }

      setCreditCardDeletion(null);
    } catch (error) {
      console.error(error);
      setCardManagerError(
        getDashboardErrorMessage(error, "Não foi possível excluir o cartão."),
      );
    } finally {
      setDeletingCardId(null);
    }
  }

  async function handleCreateCategory(categoryName: string) {
    if (blockOfflineAction("adicionar uma categoria")) {
      return false;
    }
    const trimmedCategoryName = categoryName.trim();

    if (trimmedCategoryName.length < 2) {
      setCategoryManagerError(
        "Informe uma categoria com pelo menos 2 caracteres."
      );
      return false;
    }

    if (normalizeCategoryKey(trimmedCategoryName) === "todas") {
      setCategoryManagerError("Esse nome de categoria é reservado.");
      return false;
    }

    if (hasCategoryName(trimmedCategoryName, categoryRecords)) {
      setCategoryManagerError("Essa categoria já existe.");
      return false;
    }

    try {
      setIsSavingCategory(true);
      setCategoryManagerError("");

      const createdCategory = await createExpenseCategory({
        name: trimmedCategoryName,
      });

      setCategoryRecords((currentCategories) => [
        ...currentCategories,
        createdCategory,
      ]);
      setCategory(createdCategory.name);
      showSuccessToast("Categoria adicionada.");

      return true;
    } catch (error) {
      console.error(error);
      setCategoryManagerError(
        getDashboardErrorMessage(error, "Não foi possível adicionar a categoria.")
      );
      return false;
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleUpdateCategory(
    categoryToUpdate: ExpenseCategory,
    categoryName: string
  ) {

    if (blockOfflineAction("editar uma categoria")) {
      return false;
    }
    if (!categoryToUpdate.id) {
      setCategoryManagerError("Categoria inválida para edição.");
      return false;
    }

    const trimmedCategoryName = categoryName.trim();

    if (trimmedCategoryName.length < 2) {
      setCategoryManagerError(
        "Informe uma categoria com pelo menos 2 caracteres."
      );
      return false;
    }

    if (normalizeCategoryKey(trimmedCategoryName) === "todas") {
      setCategoryManagerError("Esse nome de categoria é reservado.");
      return false;
    }

    if (
      hasCategoryName(
        trimmedCategoryName,
        categoryRecords,
        categoryToUpdate.id
      )
    ) {
      setCategoryManagerError("Essa categoria já existe.");
      return false;
    }

    try {
      setIsSavingCategory(true);
      setCategoryManagerError("");

      const updatedCategory = await updateExpenseCategory(categoryToUpdate.id, {
        name: trimmedCategoryName,
      });

      setCategoryRecords((currentCategories) =>
        currentCategories.map((currentCategory) =>
          currentCategory.id === updatedCategory.id
            ? updatedCategory
            : currentCategory
        )
      );

      setExpenses((currentExpenses) =>
        currentExpenses.map((expense) =>
          expense.category === categoryToUpdate.name
            ? { ...expense, category: updatedCategory.name }
            : expense
        )
      );

      if (category === categoryToUpdate.name) {
        setCategory(updatedCategory.name);
      }

      if (selectedCategory === categoryToUpdate.name) {
        setSelectedCategory(updatedCategory.name);
      }

      showSuccessToast("Categoria atualizada.");

      return true;
    } catch (error) {
      console.error(error);
      setCategoryManagerError(
        getDashboardErrorMessage(error, "Não foi possível editar a categoria.")
      );
      return false;
    } finally {
      setIsSavingCategory(false);
    }
  }

  function requestDeleteCategory(categoryToDelete: ExpenseCategory) {
    if (!categoryToDelete.id) {
      return;
    }

    setConfirmation({
      title: "Excluir categoria?",
      description: `A categoria "${categoryToDelete.name}" será removida da sua lista.`,
      confirmLabel: "Excluir categoria",
      variant: "danger",
      onConfirm: () => removeCategory(categoryToDelete),
    });
  }

  async function removeCategory(categoryToDelete: ExpenseCategory) {
    if (blockOfflineAction("excluir uma categoria")) {
      return;
    }
    if (!categoryToDelete.id) {
      return;
    }

    try {
      setDeletingCategoryId(categoryToDelete.id);
      setCategoryManagerError("");

      await deleteExpenseCategory(categoryToDelete.id);

      setCategoryRecords((currentCategories) =>
        currentCategories.filter(
          (currentCategory) => currentCategory.id !== categoryToDelete.id
        )
      );

      if (category === categoryToDelete.name) {
        setCategory(categoryNames[0] ?? EXPENSE_CATEGORIES[0]);
      }

      if (selectedCategory === categoryToDelete.name) {
        setSelectedCategory("Todas");
      }

      showSuccessToast("Categoria removida.");
    } catch (error) {
      console.error(error);
      setCategoryManagerError(
        getDashboardErrorMessage(
          error,
          "Não foi possível excluir a categoria. Verifique se ela possui gastos."
        )
      );
    } finally {
      setDeletingCategoryId(null);
    }
  }

  function requestEditExpense(expense: Expense) {
    setConfirmation({
      title: "Editar este gasto?",
      description: `Você vai abrir o gasto "${expense.description}" para edição.`,
      confirmLabel: "Editar gasto",
      variant: "default",
      onConfirm: () => startEditingExpense(expense),
    });
  }

  function startEditingExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setDescription(expense.description);
    setAmount(String(expense.amount).replace(".", ","));
    setCategory(expense.category);
    setDate(expense.date);
    setPaymentMethod(expense.payment_method ?? "pix");
    setCreditCardId(expense.credit_card_id ?? "");
    setInstallmentsCount(String(expense.installments_count || 1));
    setErrorMessage("");
    setIsFormOpen(true);
    setActiveView("expenses");

    smartScrollToRef(expenseFormSectionRef, {
      delayMs: 140,
      focusFirstField: true,
    });
  }

  function requestDeleteExpense(expenseId: string) {
    const expense = expenses.find((item) => item.id === expenseId);

    setConfirmation({
      title: "Remover este gasto?",
      description: expense
        ? `O gasto "${expense.description}" será removido da sua lista.`
        : "Esse gasto será removido da sua lista.",
      confirmLabel: "Remover gasto",
      variant: "danger",
      onConfirm: () => removeExpense(expenseId),
    });
  }

  async function removeExpense(expenseId: string) {
    if (blockOfflineAction("remover este gasto")) {
      return;
    }
    try {
      setDeletingExpenseId(expenseId);
      setErrorMessage("");

      await deleteExpense(expenseId);

      setExpenses((currentExpenses) =>
        currentExpenses.filter((expense) => expense.id !== expenseId)
      );

      if (editingExpenseId === expenseId) {
        resetForm();
      }

      void loadCategories();
      showSuccessToast("Gasto removido.");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        getDashboardErrorMessage(error, "Não foi possível remover o gasto.")
      );
    } finally {
      setDeletingExpenseId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }
    if (blockOfflineAction("salvar este gasto")) {
      return;
    }
    setErrorMessage("");

    const parsedAmount = parseMoneyToNumber(amount);
    const trimmedDescription = description.trim();

    if (trimmedDescription.length < 2) {
      setErrorMessage("Informe uma descrição com pelo menos 2 caracteres.");
      return;
    }

    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Informe um valor válido.");
      return;
    }

    if (!category.trim()) {
      setErrorMessage("Selecione uma categoria.");
      return;
    }

    const parsedInstallmentsCount = Number(installmentsCount);

    if (paymentMethod === "credit_card" && !creditCardId) {
      setErrorMessage("Selecione o cartão usado neste gasto.");
      return;
    }

    if (
      paymentMethod === "credit_card" &&
      (!Number.isInteger(parsedInstallmentsCount) ||
        parsedInstallmentsCount < 1 ||
        parsedInstallmentsCount > 24)
    ) {
      setErrorMessage("Informe uma quantidade de parcelas entre 1 e 24.");
      return;
    }

    const creditLimitError =
      paymentMethod === "credit_card"
        ? getCreditCardLimitError({
            cards: creditCards,
            expenses,
            creditCardId,
            amount: parsedAmount,
            expenseDate: date,
            installmentsCount: parsedInstallmentsCount,
            ignoredExpenseId: editingExpenseId,
          })
        : "";

    if (creditLimitError) {
      setErrorMessage(creditLimitError);
      return;
    }

    const successMessage = editingExpenseId
      ? "Gasto atualizado com sucesso."
      : paymentMethod === "credit_card" && parsedInstallmentsCount > 1
        ? "Compra parcelada cadastrada com sucesso."
        : "Gasto registrado com sucesso.";

    const expenseData: CreateExpenseRequest = {
      description: trimmedDescription,
      amount: parsedAmount,
      category,
      date,
      payment_method: paymentMethod,
      credit_card_id: paymentMethod === "credit_card" ? creditCardId : null,
      installments_count:
        paymentMethod === "credit_card" && !editingExpenseId
          ? parsedInstallmentsCount
          : 1,
    };

    try {
      setIsSubmitting(true);

      if (editingExpenseId) {
        const updatedExpense = await updateExpense(
          editingExpenseId,
          expenseData
        );

        setExpenses((currentExpenses) =>
          currentExpenses.map((expense) =>
            expense.id === updatedExpense.id ? updatedExpense : expense
          )
        );
      } else {
        const createdExpense = await createExpense(expenseData);

        setExpenses((currentExpenses) => [createdExpense, ...currentExpenses]);

        if (expenseData.installments_count > 1) {
          void loadExpenses();
        }
      }

      void loadCategories();
      resetForm();
      showSuccessToast(successMessage);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        getDashboardErrorMessage(
          error,
          isEditing
            ? "Não foi possível editar o gasto."
            : "Não foi possível cadastrar o gasto."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveQuickExpense(data: {
    amount: number;
    category: string;
  }) {
    if (isSavingQuickExpense) {
      return;
    }

    if (blockOfflineAction("salvar este gasto")) {
      setQuickExpenseError("Conecte-se para salvar o gasto rápido.");
      return;
    }

    try {
      setIsSavingQuickExpense(true);
      setQuickExpenseError("");

      const createdExpense = await createExpense(
        buildQuickExpensePayload({
          amount: data.amount,
          category: data.category,
          date: todayDate,
        })
      );

      setExpenses((currentExpenses) => [createdExpense, ...currentExpenses]);
      setDidSaveQuickExpense(true);
      void loadCategories();
      showSuccessToast("Gasto salvo em segundos.");
    } catch (error) {
      console.error(error);
      setQuickExpenseError(
        getDashboardErrorMessage(
          error,
          "Não conseguimos salvar agora. Tente novamente."
        )
      );
    } finally {
      setIsSavingQuickExpense(false);
    }
  }

  async function handleSaveDailyReviewDifference(data: {
    amount: number;
    category: string;
  }) {
    if (isSavingDailyReview || data.amount <= 0) {
      return;
    }

    if (blockOfflineAction("salvar esta diferença")) {
      setDailyReviewError("Conecte-se para salvar o fechamento do dia.");
      return;
    }

    try {
      setIsSavingDailyReview(true);
      setDailyReviewError("");

      const createdExpense = await createExpense(
        buildDailyReviewExpensePayload({
          amount: data.amount,
          category: data.category,
          date: todayDate,
        })
      );

      setExpenses((currentExpenses) => [createdExpense, ...currentExpenses]);
      setDidSaveDailyReview(true);
      handleMarkDailyReviewClosed();
      handleDismissDailyReviewCard();
      void loadCategories();
      showSuccessToast(
        data.category === "Miudezas"
          ? "Melhor aproximado do que esquecido."
          : "Dia organizado."
      );
    } catch (error) {
      console.error(error);
      setDailyReviewError(
        getDashboardErrorMessage(
          error,
          "Não conseguimos salvar agora. Tente novamente."
        )
      );
    } finally {
      setIsSavingDailyReview(false);
    }
  }

  function handleDismissDailyReviewCard() {
    dismissDailyReviewCard(currentUser.id, todayDate);
    setDailyReviewDismissedDate(todayDate);
  }

  function handleMarkDailyReviewClosed() {
    markDailyReviewClosed(currentUser.id, todayDate);
    setDailyReviewClosedDate(todayDate);
  }

  function handleCloseQuickExpenseSheet() {
    if (isSavingQuickExpense) {
      return;
    }

    setIsQuickExpenseSheetOpen(false);
    setQuickExpenseError("");
    setDidSaveQuickExpense(false);
  }

  function handleCloseDailyReviewSheet() {
    if (isSavingDailyReview) {
      return;
    }

    setIsDailyReviewSheetOpen(false);
    setDailyReviewError("");
    setDidSaveDailyReview(false);
  }

  function handleDismissDailyReviewFlow() {
    handleDismissDailyReviewCard();
    handleCloseDailyReviewSheet();
    showSuccessToast("Tudo bem. Você pode revisar depois.");
  }

  function handleCompleteDailyReviewFlow() {
    handleMarkDailyReviewClosed();
    handleDismissDailyReviewCard();
    handleCloseDailyReviewSheet();
    showSuccessToast("Dia organizado.");
  }

  async function handleConfirmAction() {
    if (!confirmation) {
      return;
    }

    try {
      setIsConfirmingAction(true);
      await confirmation.onConfirm();
      setConfirmation(null);
    } finally {
      setIsConfirmingAction(false);
    }
  }

  function resetForm() {
    setEditingExpenseId(null);
    setDescription("");
    setAmount("");
    setCategory(categoryNames[0] ?? EXPENSE_CATEGORIES[0]);
    setDate(getCurrentDate());
    setPaymentMethod("pix");
    setCreditCardId("");
    setInstallmentsCount("1");
  }

  function clearFilters() {
    setSelectedMonth(getCurrentMonth());
    setSelectedCategory("Todas");
    setSearchTerm("");
  }

  function showSuccessToast(message: string) {
    setToast({
      id: Date.now(),
      message,
      variant: "success",
    });
  }

  function showErrorToast(message: string) {
    setToast({
      id: Date.now(),
      message,
      variant: "error",
    });
  }

  function blockOfflineAction(actionDescription: string) {
    if (isOnline) {
      return false;
    }

    const message = `Você está offline. Conecte-se para ${actionDescription}.`;

    setErrorMessage(message);
    showErrorToast(message);

    return true;
  }
  function handleFormToggle() {
    setIsFormOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        smartScrollToRef(expenseFormSectionRef, {
          delayMs: 100,
          focusFirstField: true,
        });
      }

      return nextValue;
    });
  }

  function handleFiltersToggle() {
    setIsFiltersOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        smartScrollToRef(expenseFiltersSectionRef, {
          delayMs: 100,
        });
      }

      return nextValue;
    });
  }

  return (
    <AppShell
      activeView={activeView}
      currentUser={currentUser}
      onActiveViewChange={setActiveView}
      onLogout={onLogout}
    >
      {activeView === "appearance-settings" ? (
        <SettingsPage
          section="appearance"
          currentUser={currentUser}
          onLogout={onLogout}
        />
      ) : activeView === "security-settings" ? (
        <SettingsPage
          section="security"
          currentUser={currentUser}
          onLogout={onLogout}
        />
      ) : activeView === "businesses" ? (
        <BusinessWorkspace />
      ) : activeView === "credit-cards" ? (
        <CreditCardsView
          cards={creditCards}
          expenses={expenses}
          isOnline={isOnline}
          isLoading={isLoadingCards}
          isSaving={isSavingCard}
          deletingCardId={deletingCardId}
          errorMessage={cardManagerError}
          autoOpenCreateFormToken={creditCardFormAutoOpenToken}
          onCreateCard={handleCreateCreditCard}
          onUpdateCard={handleUpdateCreditCard}
          onDeleteCard={requestDeleteCreditCard}
          onClearError={() => setCardManagerError("")}
          onAutoOpenCreateFormHandled={() =>
            setCreditCardFormAutoOpenToken(null)
          }
        />
      ) : activeView === "reports" ? (
        <ReportsView
          expenses={expenses}
          incomes={incomes}
          selectedMonth={selectedReportMonth}
          onSelectedMonthChange={setSelectedReportMonth}
        />
      ) : activeView === "incomes" ? (
        <IncomesView
          incomes={incomes}
          isLoading={isLoadingIncomes}
          onCreateIncome={handleCreateIncome}
          onUpdateIncome={handleUpdateIncome}
          onDeleteIncome={handleDeleteIncome}
        />
      ) : (
        <ExpensesView
          currentUserName={currentUser.name}
          formSectionRef={expenseFormSectionRef}
          filtersSectionRef={expenseFiltersSectionRef}
          monthlyExpenseTotal={monthlyExpenseTotal}
          monthlyIncomeTotal={monthlyIncomeTotal}
          monthlyBalance={monthlyBalance}
          todayExpenseTotal={todayExpenseTotal}
          isTodayClosed={isTodayClosed}
          isPurposeOnboardingVisible={isPurposeOnboardingVisible}
          monthlyInsightMessage={monthlyInsightMessage}
          topMonthlyCategories={topMonthlyCategories}
          filteredExpenseTotal={filteredExpenseTotal}
          filteredExpenses={filteredExpenses}
          allExpenses={expenses}
          cachedDashboardSavedAt={cachedDashboardSavedAt}
          categoryTotals={categoryTotals}
          categories={categoryNames}
          creditCards={creditCards}
          isOnline={isOnline}
          isLoadingExpenses={isLoadingExpenses}
          isLoadingCards={isLoadingCards}
          deletingExpenseId={deletingExpenseId}
          isFormOpen={isFormOpen}
          isFiltersOpen={isFiltersOpen}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          shouldShowDailyReviewCard={shouldDisplayDailyReviewCard}
          errorMessage={errorMessage}
          description={description}
          amount={amount}
          category={category}
          date={date}
          paymentMethod={paymentMethod}
          creditCardId={creditCardId}
          installmentsCount={installmentsCount}
          selectedMonth={selectedMonth}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          onFormToggle={handleFormToggle}
          onFiltersToggle={handleFiltersToggle}
          onNewExpenseClick={handleNewExpenseClick}
          onQuickExpense={openQuickExpenseSheet}
          onOpenDailyReview={openDailyReviewSheet}
          onViewMonthlySummary={handleViewMonthlySummary}
          onDismissDailyReview={handleDismissDailyReviewCard}
          onDismissPurposeOnboarding={handleDismissPurposeOnboarding}
          onDescriptionChange={setDescription}
          onAmountChange={handleAmountChange}
          onCategoryChange={setCategory}
          onDateChange={setDate}
          onPaymentMethodChange={handlePaymentMethodChange}
          onCreditCardChange={setCreditCardId}
          onInstallmentsCountChange={handleInstallmentsCountChange}
          onManageCategoriesClick={() => {
            setCategoryManagerError("");
            setIsCategoryManagerOpen(true);
          }}
          onManageCardsClick={handleManageCardsClick}
          onRegisterCreditCardClick={handleRegisterCreditCardFromExpense}
          onOpenCreditCards={() => setActiveView("credit-cards")}
          onCancelEdit={resetForm}
          onSubmit={handleSubmit}
          onSelectedMonthChange={setSelectedMonth}
          onSelectedCategoryChange={setSelectedCategory}
          onSearchTermChange={setSearchTerm}
          onClearFilters={clearFilters}
          onEditExpense={requestEditExpense}
          onDeleteExpense={requestDeleteExpense}
        />
      )}

      <AddActionSheet
        isOpen={isAddActionSheetOpen}
        isOnline={isOnline}
        onClose={() => setIsAddActionSheetOpen(false)}
        onSelect={handleAddActionSelect}
      />
      <QuickAddExpenseSheet
        isOpen={isQuickExpenseSheetOpen}
        categories={categoryNames}
        isSaving={isSavingQuickExpense}
        errorMessage={quickExpenseError}
        didSave={didSaveQuickExpense}
        onClose={handleCloseQuickExpenseSheet}
        onSubmit={handleSaveQuickExpense}
        onResetSuccess={() => {
          setDidSaveQuickExpense(false);
          setQuickExpenseError("");
        }}
      />
      <DailyReviewSheet
        isOpen={isDailyReviewSheetOpen}
        todayTotal={todayExpenseTotal}
        categories={categoryNames}
        isSaving={isSavingDailyReview}
        errorMessage={dailyReviewError}
        didSave={didSaveDailyReview}
        onClose={handleCloseDailyReviewSheet}
        onCompleteToday={handleCompleteDailyReviewFlow}
        onDismissToday={handleDismissDailyReviewFlow}
        onSubmitDifference={handleSaveDailyReviewDifference}
        onResetSuccess={() => {
          setDidSaveDailyReview(false);
          setDailyReviewError("");
        }}
      />
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        categories={categoryRecords}
        errorMessage={categoryManagerError}
        isSaving={isSavingCategory}
        deletingCategoryId={deletingCategoryId}
        onClose={() => setIsCategoryManagerOpen(false)}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={requestDeleteCategory}
      />
      <CreditCardDeleteModal
        card={creditCardDeletion?.card ?? null}
        linkedExpensesCount={creditCardDeletion?.linkedExpensesCount ?? 0}
        isLoading={deletingCardId !== null}
        onKeepExpenses={() => void removeCreditCard(false)}
        onDeleteExpenses={() => void removeCreditCard(true)}
        onCancel={() => setCreditCardDeletion(null)}
      />
      <ConfirmModal
        isOpen={confirmation !== null}
        title={confirmation?.title ?? ""}
        description={confirmation?.description ?? ""}
        confirmLabel={confirmation?.confirmLabel ?? "Confirmar"}
        variant={confirmation?.variant}
        isLoading={isConfirmingAction}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmation(null)}
      />

      <Toast
        key={toast?.id}
        isOpen={toast !== null}
        message={toast?.message ?? ""}
        variant={toast?.variant}
        onClose={() => setToast(null)}
      />
    </AppShell>
  );
}

type ExpensesViewProps = {
  currentUserName: string;
  formSectionRef: RefObject<HTMLDivElement | null>;
  filtersSectionRef: RefObject<HTMLDivElement | null>;
  monthlyExpenseTotal: number;
  monthlyIncomeTotal: number;
  monthlyBalance: number;
  todayExpenseTotal: number;
  isTodayClosed: boolean;
  isPurposeOnboardingVisible: boolean;
  monthlyInsightMessage: string;
  topMonthlyCategories: Array<{
    category: string;
    total: number;
  }>;
  filteredExpenseTotal: number;
  filteredExpenses: Expense[];
  allExpenses: Expense[];
  cachedDashboardSavedAt: string | null;
  categoryTotals: CategoryTotal[];
  categories: string[];
  creditCards: CreditCard[];
  isOnline: boolean;
  isLoadingExpenses: boolean;
  isLoadingCards: boolean;
  deletingExpenseId: string | null;
  isFormOpen: boolean;
  isFiltersOpen: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  shouldShowDailyReviewCard: boolean;
  errorMessage: string;
  description: string;
  amount: string;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  creditCardId: string;
  installmentsCount: string;
  selectedMonth: string;
  selectedCategory: string;
  searchTerm: string;
  onFormToggle: () => void;
  onFiltersToggle: () => void;
  onNewExpenseClick: () => void;
  onQuickExpense: () => void;
  onOpenDailyReview: () => void;
  onViewMonthlySummary: () => void;
  onDismissDailyReview: () => void;
  onDismissPurposeOnboarding: () => void;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onCreditCardChange: (value: string) => void;
  onInstallmentsCountChange: (value: string) => void;
  onManageCategoriesClick: () => void;
  onManageCardsClick: () => void;
  onRegisterCreditCardClick: () => void;
  onOpenCreditCards: () => void;
  onCancelEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectedMonthChange: (value: string) => void;
  onSelectedCategoryChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onClearFilters: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
};

function ExpensesView({
  currentUserName,
  formSectionRef,
  filtersSectionRef,
  monthlyExpenseTotal,
  monthlyIncomeTotal,
  monthlyBalance,
  todayExpenseTotal,
  isTodayClosed,
  isPurposeOnboardingVisible,
  monthlyInsightMessage,
  topMonthlyCategories,
  filteredExpenseTotal,
  filteredExpenses,
  allExpenses,
  cachedDashboardSavedAt,
  categoryTotals,
  categories,
  creditCards,
  isOnline,
  isLoadingExpenses,
  isLoadingCards,
  deletingExpenseId,
  isFormOpen,
  isFiltersOpen,
  isEditing,
  isSubmitting,
  shouldShowDailyReviewCard,
  errorMessage,
  description,
  amount,
  category,
  date,
  paymentMethod,
  creditCardId,
  installmentsCount,
  selectedMonth,
  selectedCategory,
  searchTerm,
  onFormToggle,
  onFiltersToggle,
  onNewExpenseClick,
  onQuickExpense,
  onOpenDailyReview,
  onViewMonthlySummary,
  onDismissDailyReview,
  onDismissPurposeOnboarding,
  onDescriptionChange,
  onAmountChange,
  onCategoryChange,
  onDateChange,
  onPaymentMethodChange,
  onCreditCardChange,
  onInstallmentsCountChange,
  onManageCategoriesClick,
  onManageCardsClick,
  onRegisterCreditCardClick,
  onOpenCreditCards,
  onCancelEdit,
  onSubmit,
  onSelectedMonthChange,
  onSelectedCategoryChange,
  onSearchTermChange,
  onClearFilters,
  onEditExpense,
  onDeleteExpense,
}: ExpensesViewProps) {
  const availableExpenseMonths = getExistingExpenseMonths(allExpenses);

  if (isLoadingExpenses && filteredExpenses.length === 0) {
    return (
      <div className="space-y-5">
        <OfflineStatusBanner />
        <CachedDataNotice savedAt={cachedDashboardSavedAt} />

        <PurposeOnboarding
          isVisible={isPurposeOnboardingVisible}
          onDismiss={onDismissPurposeOnboarding}
        />

        <TodayStatusCard
          userName={currentUserName}
          todayTotal={todayExpenseTotal}
          isDayClosed={isTodayClosed}
          isOnline={isOnline}
          onAddExpense={onNewExpenseClick}
          onOpenDailyReview={onOpenDailyReview}
        />

        <QuickActionsCard
          isOnline={isOnline}
          onQuickExpense={onQuickExpense}
          onDailyReview={onOpenDailyReview}
          onViewSummary={onViewMonthlySummary}
        />

        {shouldShowDailyReviewCard ? (
          <DailyReviewCard
            todayTotalLabel={formatCurrency(todayExpenseTotal)}
            onOpen={onOpenDailyReview}
            onDismiss={onDismissDailyReview}
          />
        ) : null}

        <MobileDashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OfflineStatusBanner />
      <CachedDataNotice savedAt={cachedDashboardSavedAt} />

      <PurposeOnboarding
        isVisible={isPurposeOnboardingVisible}
        onDismiss={onDismissPurposeOnboarding}
      />

      <TodayStatusCard
        userName={currentUserName}
        todayTotal={todayExpenseTotal}
        isDayClosed={isTodayClosed}
        isOnline={isOnline}
        onAddExpense={onNewExpenseClick}
        onOpenDailyReview={onOpenDailyReview}
      />

      <QuickActionsCard
        isOnline={isOnline}
        onQuickExpense={onQuickExpense}
        onDailyReview={onOpenDailyReview}
        onViewSummary={onViewMonthlySummary}
      />

      {shouldShowDailyReviewCard ? (
        <DailyReviewCard
          todayTotalLabel={formatCurrency(todayExpenseTotal)}
          onOpen={onOpenDailyReview}
          onDismiss={onDismissDailyReview}
        />
      ) : null}

      <UpcomingInvoicesStrip
        creditCards={creditCards}
        expenses={allExpenses}
        onOpenCards={onOpenCreditCards}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <MonthlyPurposeSummary
          monthlyExpenseTotal={monthlyExpenseTotal}
          monthlyIncomeTotal={monthlyIncomeTotal}
          monthlyBalance={monthlyBalance}
          monthlyInsightMessage={monthlyInsightMessage}
        />

        <MoneyDestinationCard topCategories={topMonthlyCategories} />
      </div>

      <SummaryCards
        monthlyTotal={monthlyExpenseTotal}
        filteredTotal={filteredExpenseTotal}
        expensesCount={filteredExpenses.length}
        categoryTotals={categoryTotals}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <div ref={formSectionRef} className="scroll-mt-5">
          <CollapsibleSection
            title={isEditing ? "Editar gasto" : "Novo gasto"}
            description={
              isEditing
                ? "Ajuste as informações do gasto selecionado."
                : "Cadastre uma nova despesa."
            }
            isOpen={isFormOpen}
            onToggle={onFormToggle}
            badge={isEditing ? "Editando" : "Cadastro"}
          >
            <ExpenseForm
              description={description}
              amount={amount}
              category={category}
              date={date}
              paymentMethod={paymentMethod}
              creditCardId={creditCardId}
              installmentsCount={installmentsCount}
              creditCards={creditCards}
              categories={categories}
              isSubmitting={isSubmitting}
              isOnline={isOnline}
              isLoadingCreditCards={isLoadingCards}
              isEditing={isEditing}
              errorMessage={errorMessage}
              onDescriptionChange={onDescriptionChange}
              onAmountChange={onAmountChange}
              onCategoryChange={onCategoryChange}
              onDateChange={onDateChange}
              onPaymentMethodChange={onPaymentMethodChange}
              onCreditCardChange={onCreditCardChange}
              onInstallmentsCountChange={onInstallmentsCountChange}
              onManageCategoriesClick={onManageCategoriesClick}
              onManageCardsClick={onManageCardsClick}
              onRegisterCreditCardClick={onRegisterCreditCardClick}
              onCancelEdit={onCancelEdit}
              onSubmit={onSubmit}
            />
          </CollapsibleSection>
        </div>

        <div className="space-y-4">
          <div ref={filtersSectionRef} className="scroll-mt-5">
            <ExpenseFilters
              selectedMonth={selectedMonth}
              selectedCategory={selectedCategory}
              searchTerm={searchTerm}
              categories={categories}
              availableMonths={availableExpenseMonths}
              isOpen={isFiltersOpen}
              onToggle={onFiltersToggle}
              onSelectedMonthChange={onSelectedMonthChange}
              onSelectedCategoryChange={onSelectedCategoryChange}
              onSearchTermChange={onSearchTermChange}
              onClearFilters={onClearFilters}
            />
          </div>

          <ExpenseList
            expenses={filteredExpenses}
            isLoading={isLoadingExpenses}
            isOnline={isOnline}
            deletingExpenseId={deletingExpenseId}
            onEdit={onEditExpense}
            onDelete={onDeleteExpense}
          />
        </div>
      </div>
    </div>
  );
}

type CreditCardDeletionState = {
  card: CreditCard;
  linkedExpensesCount: number;
};

function getCreditCardLimitError({
  cards,
  expenses,
  creditCardId,
  amount,
  expenseDate,
  installmentsCount,
  ignoredExpenseId,
}: {
  cards: CreditCard[];
  expenses: Expense[];
  creditCardId: string;
  amount: number;
  expenseDate: string;
  installmentsCount: number;
  ignoredExpenseId: string | null;
}) {
  const card = cards.find((currentCard) => currentCard.id === creditCardId);

  if (!card || card.limit_amount === null || card.limit_amount <= 0) {
    return "";
  }

  const limitAmount = roundCurrency(card.limit_amount);
  const purchaseAmount = roundCurrency(amount);

  if (purchaseAmount > limitAmount) {
    return `Essa compra não pode ser lançada: ${formatCurrency(
      purchaseAmount,
    )} ultrapassa o limite de ${formatCurrency(limitAmount)} do cartão ${
      card.name
    }.`;
  }

  const installmentAmounts = splitExpenseInstallmentAmounts(
    purchaseAmount,
    installmentsCount,
  );

  for (let index = 0; index < installmentAmounts.length; index += 1) {
    const installmentDate = addMonthsToDateValue(expenseDate, index);
    const invoiceMonth = calculateCreditCardInvoiceMonth(
      installmentDate,
      card.closing_day,
    );
    const currentInvoiceTotal = getCreditCardInvoiceTotal({
      expenses,
      cardId: card.id,
      invoiceMonth,
      ignoredExpenseId,
    });
    const nextInvoiceTotal = roundCurrency(
      currentInvoiceTotal + installmentAmounts[index],
    );

    if (nextInvoiceTotal > limitAmount) {
      return `Essa compra passaria o limite do cartão ${card.name}. Limite: ${formatCurrency(
        limitAmount,
      )}. Fatura após o lançamento: ${formatCurrency(nextInvoiceTotal)}.`;
    }
  }

  return "";
}

function getCreditCardInvoiceTotal({
  expenses,
  cardId,
  invoiceMonth,
  ignoredExpenseId,
}: {
  expenses: Expense[];
  cardId: string;
  invoiceMonth: string;
  ignoredExpenseId: string | null;
}) {
  return expenses.reduce((total, expense) => {
    if (expense.id === ignoredExpenseId) {
      return total;
    }

    if (expense.payment_method !== "credit_card") {
      return total;
    }

    if (expense.credit_card_id !== cardId) {
      return total;
    }

    const expenseInvoiceMonth = expense.invoice_month || getMonthFromDateValue(expense.date);

    if (expenseInvoiceMonth !== invoiceMonth) {
      return total;
    }

    return total + expense.amount;
  }, 0);
}

function splitExpenseInstallmentAmounts(
  totalAmount: number,
  installmentsCount: number,
) {
  const safeInstallmentsCount = Math.max(1, installmentsCount);

  if (safeInstallmentsCount <= 1) {
    return [roundCurrency(totalAmount)];
  }

  const baseAmount = roundCurrency(totalAmount / safeInstallmentsCount);
  const amounts = Array.from({ length: safeInstallmentsCount }, () => baseAmount);
  const difference = roundCurrency(totalAmount - amounts.reduce((total, value) => total + value, 0));
  amounts[amounts.length - 1] = roundCurrency(amounts[amounts.length - 1] + difference);

  return amounts;
}

function calculateCreditCardInvoiceMonth(
  expenseDateValue: string,
  closingDay: number,
) {
  const expenseDate = parseDateValue(expenseDateValue);
  const effectiveClosingDay = Math.min(
    closingDay,
    getLastDayOfMonth(expenseDate.getFullYear(), expenseDate.getMonth()),
  );

  if (expenseDate.getDate() > effectiveClosingDay) {
    return getMonthFromDate(addMonthsToDate(expenseDate, 1));
  }

  return getMonthFromDate(expenseDate);
}

function addMonthsToDateValue(value: string, monthsToAdd: number) {
  return toDateValue(addMonthsToDate(parseDateValue(value), monthsToAdd));
}

function addMonthsToDate(dateValue: Date, monthsToAdd: number) {
  const targetYear = dateValue.getFullYear();
  const targetMonth = dateValue.getMonth() + monthsToAdd;
  const targetDate = new Date(targetYear, targetMonth, 1);
  const lastDay = getLastDayOfMonth(targetDate.getFullYear(), targetDate.getMonth());

  targetDate.setDate(Math.min(dateValue.getDate(), lastDay));

  return targetDate;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(`${getCurrentDate()}T00:00:00`);
  }

  return new Date(year, month - 1, day);
}

function getLastDayOfMonth(year: number, zeroBasedMonth: number) {
  return new Date(year, zeroBasedMonth + 1, 0).getDate();
}

function getMonthFromDate(dateValue: Date) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function toDateValue(dateValue: Date) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function createLocalDefaultCategories(): ExpenseCategory[] {
  return EXPENSE_CATEGORIES.map((categoryName) => ({
    id: null,
    name: categoryName,
    is_default: true,
    is_custom: false,
    is_used: false,
    can_edit: false,
    can_delete: false,
  }));
}

function mergeCategoryNames(categoryNames: readonly string[]) {
  const categories: string[] = [];
  const existingKeys = new Set<string>();

  for (const categoryName of categoryNames) {
    const normalizedName = categoryName.trim();
    const categoryKey = normalizeCategoryKey(normalizedName);

    if (!normalizedName || existingKeys.has(categoryKey)) {
      continue;
    }

    categories.push(normalizedName);
    existingKeys.add(categoryKey);
  }

  return categories;
}

function hasCategoryName(
  categoryName: string,
  categories: readonly ExpenseCategory[],
  ignoredCategoryId?: string
) {
  const categoryKey = normalizeCategoryKey(categoryName);

  return categories.some((category) => {
    if (ignoredCategoryId && category.id === ignoredCategoryId) {
      return false;
    }

    return normalizeCategoryKey(category.name) === categoryKey;
  });
}

function getDashboardErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Você está sem internet. Conecte-se e tente novamente.";
  }

  if (error instanceof Error) {
    const message = error.message.trim();

    if (message) {
      return message;
    }
  }

  return fallbackMessage;
}

function markExpensesCreditCardAsDeleted(
  expenses: Expense[],
  card: CreditCard,
): Expense[] {
  return expenses.map((expense) => {
    if (expense.credit_card_id !== card.id) {
      return expense;
    }

    return {
      ...expense,
      credit_card_id: null,
      credit_card: {
        id: null,
        name: card.name,
        brand: card.brand,
        last_four_digits: card.last_four_digits,
        color: card.color,
        due_day: card.due_day,
        is_deleted: true,
      },
    };
  });
}

function getExistingExpenseMonths(expenses: Expense[]) {
  const months = new Set<string>();

  for (const expense of expenses) {
    const month = getMonthFromDateValue(expense.date);

    if (month) {
      months.add(month);
    }
  }

  return Array.from(months).sort((firstMonth, secondMonth) =>
    secondMonth.localeCompare(firstMonth),
  );
}

function getMonthFromDateValue(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}/.test(value)) {
    return value.slice(0, 7);
  }

  return "";
}

function normalizeCategoryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

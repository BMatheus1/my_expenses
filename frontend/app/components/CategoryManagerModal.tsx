"use client";

import { useMemo, useState } from "react";

import type { ExpenseCategory } from "../types/category";

type CategoryManagerModalProps = {
  isOpen: boolean;
  categories: ExpenseCategory[];
  errorMessage: string;
  isSaving: boolean;
  deletingCategoryId: string | null;
  onClose: () => void;
  onCreateCategory: (name: string) => Promise<boolean>;
  onUpdateCategory: (
    category: ExpenseCategory,
    name: string
  ) => Promise<boolean>;
  onDeleteCategory: (category: ExpenseCategory) => void;
};

export function CategoryManagerModal({
  isOpen,
  categories,
  errorMessage,
  isSaving,
  deletingCategoryId,
  onClose,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerModalProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const defaultCategories = useMemo(() => {
    return categories.filter((category) => category.is_default);
  }, [categories]);

  const customCategories = useMemo(() => {
    return categories.filter((category) => category.is_custom);
  }, [categories]);

  if (!isOpen) {
    return null;
  }

  async function handleCreateCategory() {
    const created = await onCreateCategory(newCategoryName);

    if (created) {
      setNewCategoryName("");
    }
  }

  async function handleUpdateCategory(category: ExpenseCategory) {
    const updated = await onUpdateCategory(category, editingCategoryName);

    if (updated) {
      cancelEditing();
    }
  }

  function startEditing(category: ExpenseCategory) {
    if (!category.id) {
      return;
    }

    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  }

  function cancelEditing() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6">
      <section className="mobile-sheet-panel w-full max-w-md rounded-3xl border border-stone-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-stone-950">
              Categorias
            </h2>

            <p className="mt-1 text-xs text-stone-500">
              Gerencie suas categorias personalizadas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
          >
            Fechar
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Nova categoria"
              className="app-input px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={isSaving}
              className="rounded-2xl bg-stone-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Salvando..." : "Adicionar"}
            </button>
          </div>

          {errorMessage && (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </p>
          )}

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
              Padrão
            </p>

            <div className="flex flex-wrap gap-2">
              {defaultCategories.map((category) => (
                <span
                  key={category.name}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-500"
                >
                  {category.name}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
              Suas categorias
            </p>

            {customCategories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-center">
                <p className="text-sm font-bold text-stone-700">
                  Nenhuma categoria personalizada
                </p>

                <p className="mt-1 text-xs text-stone-500">
                  Adicione uma categoria acima para organizar melhor seus gastos.
                </p>
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {customCategories.map((category) => {
                  const isEditing =
                    category.id !== null && editingCategoryId === category.id;

                  const isDeleting = deletingCategoryId === category.id;

                  return (
                    <article
                      key={category.id ?? category.name}
                      className="rounded-2xl border border-stone-200 bg-white px-3 py-2"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(event) =>
                              setEditingCategoryName(event.target.value)
                            }
                            className="app-input px-3 py-2 text-sm"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(category)}
                              disabled={isSaving}
                              className="rounded-full bg-stone-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Salvar
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-stone-900">
                                {category.name}
                              </p>

                              {category.is_used && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                  em uso
                                </span>
                              )}
                            </div>

                            {!category.can_delete && (
                              <p className="mt-1 text-xs text-stone-500">
                                Possui gastos vinculados.
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(category)}
                              className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteCategory(category)}
                              disabled={!category.can_delete || isDeleting}
                              className="rounded-full border border-red-100 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isDeleting ? "..." : "Excluir"}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

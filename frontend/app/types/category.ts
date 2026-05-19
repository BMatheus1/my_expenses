export type ExpenseCategory = {
  id: string | null;
  name: string;
  is_default: boolean;
  is_custom: boolean;
  is_used: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type CreateExpenseCategoryRequest = {
  name: string;
};

export type UpdateExpenseCategoryRequest = {
  name: string;
};
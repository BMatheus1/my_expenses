import type { BusinessMaterial, BusinessService } from "@/app/types/business";

export type BusinessTab = "resumo" | "estoque" | "servicos" | "vendas";

export type BusinessFormState = {
  name: string;
  type: string;
  description: string;
};

export type MaterialFormState = {
  name: string;
  category: string;
  stock_quantity: string;
  unit: string;
  total_cost: string;
  supplier: string;
  purchase_date: string;
  notes: string;
};

export type ServiceFormState = {
  name: string;
  category: string;
  price: string;
  estimated_minutes: string;
  notes: string;
};

export type RecipeFormState = {
  service_id: string;
  material_id: string;
  quantity_used: string;
};

export type SaleFormState = {
  service_id: string;
  quantity: string;
  unit_price: string;
  sale_date: string;
  payment_method: string;
  notes: string;
};

export type DeleteBusinessMode = "password" | "google";

export type StockStats = {
  totalItens: number;
  valorEmEstoque: number;
  materiaisBaixos: BusinessMaterial[];
  totalCategorias: number;
};

export type GoogleCredentialResponse = {
  credential?: string;
};

export type GoogleButtonOptions = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
};

export type GoogleIdentityServices = {
  accounts?: {
    id?: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: GoogleButtonOptions,
      ) => void;
    };
  };
};

export type NextActionParams = {
  materiais: BusinessMaterial[];
  servicos: BusinessService[];
  vendasLength: number;
  servicosComBaixaCapacidade: BusinessService[];
};
import type {
  BusinessFormState,
  MaterialFormState,
  RecipeFormState,
  SaleFormState,
  ServiceFormState,
} from "./businessTypes";

export const GOOGLE_SCRIPT_ID = "google-identity-services-script";

export const TIPOS_NEGOCIO = [
  "Beleza",
  "Alimentação",
  "Loja",
  "Serviços",
  "Artesanato",
  "Construção",
  "Outro",
];

export const UNIDADES = [
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

export const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
];

export const hoje = new Date().toISOString().slice(0, 10);

export const negocioInicial: BusinessFormState = {
  name: "",
  type: "Outro",
  description: "",
};

export const materialInicial: MaterialFormState = {
  name: "",
  category: "Matéria-prima",
  stock_quantity: "",
  unit: "unidade",
  total_cost: "",
  supplier: "",
  purchase_date: hoje,
  notes: "",
};

export const servicoInicial: ServiceFormState = {
  name: "",
  category: "Serviço",
  price: "",
  estimated_minutes: "",
  notes: "",
};

export const fichaInicial: RecipeFormState = {
  service_id: "",
  material_id: "",
  quantity_used: "",
};

export const vendaInicial: SaleFormState = {
  service_id: "",
  quantity: "1",
  unit_price: "",
  sale_date: hoje,
  payment_method: "Pix",
  notes: "",
};
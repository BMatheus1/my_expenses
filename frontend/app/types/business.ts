export type Business = {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  created_at: string;
};

export type BusinessCreatePayload = {
  name: string;
  type: string;
  description?: string | null;
};

export type BusinessUpdatePayload = BusinessCreatePayload;

export type BusinessDeletePayload = {
  password?: string | null;
  google_credential?: string | null;
};

export type BusinessMaterial = {
  id: string;
  business_id: string;
  name: string;
  category: string;
  stock_quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier?: string | null;
  purchase_date: string;
  notes?: string | null;
  created_at: string;
};

export type BusinessMaterialCreatePayload = {
  name: string;
  category: string;
  stock_quantity: number;
  unit: string;
  total_cost: number;
  supplier?: string | null;
  purchase_date: string;
  notes?: string | null;
};

export type BusinessService = {
  id: string;
  business_id: string;
  name: string;
  category: string;
  price: number;
  estimated_minutes?: number | null;
  notes?: string | null;
  created_at: string;
  materials: BusinessRecipeItem[];
  material_cost: number;
  gross_profit: number;
  gross_margin_percent: number;
  current_capacity?: number | null;
};

export type BusinessServiceCreatePayload = {
  name: string;
  category: string;
  price: number;
  estimated_minutes?: number | null;
  notes?: string | null;
};

export type BusinessServiceUpdatePayload = BusinessServiceCreatePayload;

export type BusinessRecipeItem = {
  id: string;
  service_id: string;
  material_id: string;
  material_name: string;
  material_category: string;
  quantity_used: number;
  unit: string;
  unit_cost: number;
  stock_quantity: number;
  total_cost: number;
  created_at: string;
};

export type BusinessRecipeItemCreatePayload = {
  material_id: string;
  quantity_used: number;
};

export type BusinessRecipeItemUpdatePayload = {
  quantity_used: number;
};

export type BusinessSale = {
  id: string;
  business_id: string;
  service_id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  total_material_cost: number;
  gross_profit: number;
  gross_margin_percent: number;
  sale_date: string;
  payment_method: string;
  notes?: string | null;
  created_at: string;
};

export type BusinessSaleCreatePayload = {
  service_id: string;
  quantity: number;
  unit_price?: number | null;
  sale_date: string;
  payment_method: string;
  notes?: string | null;
};

export type BusinessDashboardSummary = {
  total_sales: number;
  total_material_cost: number;
  gross_profit: number;
  gross_margin_percent: number;
  materials_count: number;
  services_count: number;
  low_stock_services_count: number;
};

export type BusinessDashboard = {
  business: Business;
  summary: BusinessDashboardSummary;
  services: BusinessService[];
  recent_sales: BusinessSale[];
};
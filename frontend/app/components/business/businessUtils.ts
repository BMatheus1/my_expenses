import { BUSINESS_REFRESH_EVENT } from "@/app/lib/business-navigation";

import { GOOGLE_SCRIPT_ID } from "./businessConstants";
import type {
  GoogleIdentityServices,
  NextActionParams,
} from "./businessTypes";

export function toNumber(value: string): number {
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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

export function getErrorMessage(error: unknown): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Você está sem internet. Conecte-se para carregar ou salvar os dados do negócio.";
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("sem internet")) {
      return "Você está sem internet. Conecte-se para carregar ou salvar os dados do negócio.";
    }

    if (normalizedMessage.includes("conexão demorou")) {
      return "A conexão demorou mais que o esperado. Verifique sua internet e tente novamente.";
    }

    if (
      normalizedMessage.includes("não foi possível conectar") ||
      normalizedMessage.includes("failed to fetch") ||
      normalizedMessage.includes("network")
    ) {
      return "Não foi possível conectar ao servidor agora. Tente novamente em alguns segundos.";
    }

    return message || "Não foi possível concluir a operação.";
  }

  return "Não foi possível concluir a operação.";
}

export function calculatePreviewUnitCost(
  quantity: string,
  totalCost: string,
): number {
  const quantityNumber = toNumber(quantity);
  const totalCostNumber = toNumber(totalCost);

  if (quantityNumber <= 0 || totalCostNumber <= 0) {
    return 0;
  }

  return totalCostNumber / quantityNumber;
}

export function dispatchBusinessRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(BUSINESS_REFRESH_EVENT));
}

export function getNextActionMessage({
  materiais,
  servicos,
  vendasLength,
  servicosComBaixaCapacidade,
}: NextActionParams) {
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

  if (vendasLength === 0) {
    return "Registre sua primeira venda para o sistema baixar estoque automaticamente e mostrar lucro real.";
  }

  return "Seu fluxo principal está configurado. Continue registrando vendas para acompanhar lucro, estoque e serviços mais rentáveis.";
}

export function getGoogleIdentityService() {
  const windowWithGoogle = window as unknown as {
    google?: GoogleIdentityServices;
  };

  return windowWithGoogle.google?.accounts?.id;
}

export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google só pode ser usado no navegador."));
      return;
    }

    if (getGoogleIdentityService()) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), {
        once: true,
      });

      existingScript.addEventListener(
        "error",
        () => {
          reject(new Error("Não foi possível carregar o Google."));
        },
        {
          once: true,
        },
      );

      return;
    }

    const script = document.createElement("script");

    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();

    script.onerror = () => {
      reject(new Error("Não foi possível carregar o Google."));
    };

    document.body.appendChild(script);
  });
}
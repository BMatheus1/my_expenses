export type AppThemeName =
  | "emerald"
  | "ocean"
  | "royal"
  | "violet"
  | "rose"
  | "sunset"
  | "amber"
  | "teal"
  | "graphite"
  | "midnight";

export type AppColorMode = "light" | "dark";

export type AppTheme = {
  name: AppThemeName;
  label: string;
  description: string;
  primary: string;
  soft: string;
  border: string;
  accent: string;
};

export const APP_THEME_STORAGE_KEY = "my-expenses-theme";
export const APP_MODE_STORAGE_KEY = "my-expenses-color-mode";

export const DEFAULT_APP_THEME: AppThemeName = "emerald";
export const DEFAULT_APP_MODE: AppColorMode = "light";

export const APP_THEMES: AppTheme[] = [
  {
    name: "emerald",
    label: "Esmeralda",
    description: "Financeiro, equilibrado e moderno.",
    primary: "#047857",
    soft: "#ecfdf5",
    border: "#a7f3d0",
    accent: "#10b981",
  },
  {
    name: "ocean",
    label: "Oceano",
    description: "Azul limpo, confiável e profissional.",
    primary: "#0369a1",
    soft: "#e0f2fe",
    border: "#7dd3fc",
    accent: "#0ea5e9",
  },
  {
    name: "royal",
    label: "Royal",
    description: "Forte, tecnológico e corporativo.",
    primary: "#4338ca",
    soft: "#eef2ff",
    border: "#c7d2fe",
    accent: "#6366f1",
  },
  {
    name: "violet",
    label: "Violeta",
    description: "Criativo, premium e elegante.",
    primary: "#7c3aed",
    soft: "#f5f3ff",
    border: "#ddd6fe",
    accent: "#a855f7",
  },
  {
    name: "rose",
    label: "Rosa",
    description: "Sofisticado, delicado e atual.",
    primary: "#be185d",
    soft: "#fdf2f8",
    border: "#f9a8d4",
    accent: "#ec4899",
  },
  {
    name: "sunset",
    label: "Sunset",
    description: "Quente, vibrante e empreendedor.",
    primary: "#c2410c",
    soft: "#fff7ed",
    border: "#fed7aa",
    accent: "#f97316",
  },
  {
    name: "amber",
    label: "Âmbar",
    description: "Energético, claro e amigável.",
    primary: "#b45309",
    soft: "#fffbeb",
    border: "#fde68a",
    accent: "#f59e0b",
  },
  {
    name: "teal",
    label: "Teal",
    description: "Calmo, refinado e clean.",
    primary: "#0f766e",
    soft: "#f0fdfa",
    border: "#99f6e4",
    accent: "#14b8a6",
  },
  {
    name: "graphite",
    label: "Grafite",
    description: "Neutro, discreto e premium.",
    primary: "#334155",
    soft: "#f8fafc",
    border: "#cbd5e1",
    accent: "#64748b",
  },
  {
    name: "midnight",
    label: "Midnight",
    description: "Escuro, elegante e de alto contraste.",
    primary: "#312e81",
    soft: "#eef2ff",
    border: "#c4b5fd",
    accent: "#8b5cf6",
  },
];

const APP_THEME_NAMES = APP_THEMES.map((theme) => theme.name);

export function getSavedAppTheme(userId?: string | null): AppThemeName {
  if (typeof window === "undefined") {
    return DEFAULT_APP_THEME;
  }

  const savedTheme = window.localStorage.getItem(
    getAppearanceStorageKey(APP_THEME_STORAGE_KEY, userId),
  );

  return isAppThemeName(savedTheme) ? savedTheme : DEFAULT_APP_THEME;
}

export function getSavedAppMode(userId?: string | null): AppColorMode {
  if (typeof window === "undefined") {
    return DEFAULT_APP_MODE;
  }

  const savedMode = window.localStorage.getItem(
    getAppearanceStorageKey(APP_MODE_STORAGE_KEY, userId),
  );

  return isAppColorMode(savedMode) ? savedMode : DEFAULT_APP_MODE;
}

export function applyAppAppearance(theme: AppThemeName, mode: AppColorMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.appTheme = theme;
  document.documentElement.dataset.appMode = mode;

  updateBrowserThemeColor(mode);
}

export function applyDefaultAppAppearance() {
  applyAppAppearance(DEFAULT_APP_THEME, DEFAULT_APP_MODE);
}

export function initializeAppTheme() {
  applyAppAppearance(getSavedAppTheme(), getSavedAppMode());
}

export function initializeUserAppTheme(userId: string) {
  applyAppAppearance(getSavedAppTheme(userId), getSavedAppMode(userId));
}

export function saveAndApplyAppTheme(
  theme: AppThemeName,
  userId?: string | null,
) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      getAppearanceStorageKey(APP_THEME_STORAGE_KEY, userId),
      theme,
    );
  }

  applyAppAppearance(theme, getSavedAppMode(userId));
}

export function saveAndApplyAppMode(
  mode: AppColorMode,
  userId?: string | null,
) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      getAppearanceStorageKey(APP_MODE_STORAGE_KEY, userId),
      mode,
    );
  }

  applyAppAppearance(getSavedAppTheme(userId), mode);
}

export function clearAppAppearancePreferences() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(APP_THEME_STORAGE_KEY);
  window.localStorage.removeItem(APP_MODE_STORAGE_KEY);

  applyDefaultAppAppearance();
}

export function clearUserAppAppearancePreferences(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    getAppearanceStorageKey(APP_THEME_STORAGE_KEY, userId),
  );

  window.localStorage.removeItem(
    getAppearanceStorageKey(APP_MODE_STORAGE_KEY, userId),
  );

  applyDefaultAppAppearance();
}

function getAppearanceStorageKey(baseKey: string, userId?: string | null) {
  if (!userId) {
    return baseKey;
  }

  return `${baseKey}:${userId}`;
}

function isAppThemeName(value: string | null): value is AppThemeName {
  return APP_THEME_NAMES.includes(value as AppThemeName);
}

function isAppColorMode(value: string | null): value is AppColorMode {
  return value === "light" || value === "dark";
}

function updateBrowserThemeColor(mode: AppColorMode) {
  const metaThemeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );

  if (!metaThemeColor) {
    return;
  }

  metaThemeColor.content = mode === "dark" ? "#0f172a" : "#f8fafc";
}
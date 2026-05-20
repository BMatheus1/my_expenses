"use client";

import { useEffect, useState } from "react";

import {
  APP_THEMES,
  type AppColorMode,
  type AppTheme,
  type AppThemeName,
  getSavedAppMode,
  getSavedAppTheme,
  initializeAppTheme,
  saveAndApplyAppMode,
  saveAndApplyAppTheme,
} from "@/app/lib/theme";

const DISPLAY_MODES: Array<{
  value: AppColorMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: "light",
    label: "Claro",
    description: "Interface leve, limpa e com bastante contraste.",
    icon: "☀",
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Visual premium, menos brilho e ótimo para uso noturno.",
    icon: "☾",
  },
];

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState<AppThemeName>("emerald");
  const [selectedMode, setSelectedMode] = useState<AppColorMode>("light");

  useEffect(() => {
    initializeAppTheme();
    setSelectedTheme(getSavedAppTheme());
    setSelectedMode(getSavedAppMode());
  }, []);

  function handleThemeChange(theme: AppThemeName) {
    setSelectedTheme(theme);
    saveAndApplyAppTheme(theme);
  }

  function handleModeChange(mode: AppColorMode) {
    setSelectedMode(mode);
    saveAndApplyAppMode(mode);
  }

  return (
    <section className="space-y-6">
      <SettingsHeader />

      <section className="app-card rounded-3xl p-6">
        <SectionHeader
          title="Modo de exibição"
          description="Escolha entre modo claro e modo escuro sem perder a identidade da paleta selecionada."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {DISPLAY_MODES.map((mode) => (
            <ModeOption
              key={mode.value}
              mode={mode}
              isSelected={selectedMode === mode.value}
              onSelect={handleModeChange}
            />
          ))}
        </div>
      </section>

      <section className="app-card rounded-3xl p-6">
        <SectionHeader
          title="Tema da aplicação"
          description="Escolha uma das 10 paletas. Todos os botões, cards, destaques e estados ativos passam a usar a mesma identidade visual."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {APP_THEMES.map((theme) => (
            <ThemeOption
              key={theme.name}
              theme={theme}
              isSelected={selectedTheme === theme.name}
              onSelect={handleThemeChange}
            />
          ))}
        </div>
      </section>

      <ThemePreview />
    </section>
  );
}

function SettingsHeader() {
  return (
    <header className="app-card rounded-3xl p-6">
      <p className="app-kicker">Configurações</p>

      <h1 className="app-title mt-2 text-3xl font-black tracking-tight">
        Aparência
      </h1>

      <p className="app-muted mt-2 max-w-3xl text-sm leading-6">
        Personalize o app com temas modernos, harmônicos e consistentes. Esta
        tela salva sua escolha no navegador e aplica a identidade visual em toda
        a aplicação.
      </p>
    </header>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="app-title text-xl font-black tracking-tight">{title}</h2>
      <p className="app-muted mt-1 text-sm leading-6">{description}</p>
    </div>
  );
}

type ModeOptionProps = {
  mode: (typeof DISPLAY_MODES)[number];
  isSelected: boolean;
  onSelect: (mode: AppColorMode) => void;
};

function ModeOption({ mode, isSelected, onSelect }: ModeOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode.value)}
      className={`app-card-hover rounded-3xl border p-5 text-left ${
        isSelected ? "app-brand-border app-brand-ring" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="app-btn app-btn-soft flex h-12 w-12 rounded-2xl text-lg">
          {mode.icon}
        </span>

        <ActiveBadge isVisible={isSelected} />
      </div>

      <h3 className="app-title mt-4 text-lg font-black">{mode.label}</h3>
      <p className="app-muted mt-1 text-sm leading-6">{mode.description}</p>
    </button>
  );
}

type ThemeOptionProps = {
  theme: AppTheme;
  isSelected: boolean;
  onSelect: (theme: AppThemeName) => void;
};

function ThemeOption({ theme, isSelected, onSelect }: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(theme.name)}
      className={`app-card-hover rounded-3xl border p-5 text-left ${
        isSelected ? "app-brand-border app-brand-ring" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
          }}
        >
          ✓
        </div>

        <ActiveBadge isVisible={isSelected} />
      </div>

      <h3 className="app-title mt-4 text-lg font-black">{theme.label}</h3>
      <p className="app-muted mt-1 text-sm leading-6">{theme.description}</p>

      <div className="mt-4 flex gap-2">
        <ColorDot color={theme.primary} />
        <ColorDot color={theme.accent} />
        <ColorDot color={theme.soft} borderColor={theme.border} />
      </div>
    </button>
  );
}

function ActiveBadge({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) {
    return null;
  }

  return (
    <span className="app-brand-soft rounded-full px-3 py-1 text-xs font-black">
      Ativo
    </span>
  );
}

function ColorDot({
  color,
  borderColor,
}: {
  color: string;
  borderColor?: string;
}) {
  return (
    <span
      className="h-6 w-10 rounded-full border"
      style={{
        backgroundColor: color,
        borderColor: borderColor ?? color,
      }}
    />
  );
}

function ThemePreview() {
  return (
    <section className="app-card rounded-3xl p-6">
      <SectionHeader
        title="Prévia do tema"
        description="Exemplo de como os principais elementos ficam depois da escolha do tema."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="app-card-soft rounded-3xl p-5">
          <p className="app-muted text-sm font-bold">Botão principal</p>

          <button
            type="button"
            className="app-btn app-btn-primary mt-4 w-full px-5 py-3 text-sm"
          >
            Salvar alteração
          </button>
        </div>

        <div className="app-card-soft rounded-3xl p-5">
          <p className="app-muted text-sm font-bold">Destaque suave</p>

          <div className="app-brand-soft mt-4 rounded-2xl p-4">
            <p className="text-sm font-black">Resumo atualizado</p>
            <p className="mt-1 text-xs leading-5">
              Esta área usa uma versão leve da cor principal.
            </p>
          </div>
        </div>

        <div className="app-card-soft rounded-3xl p-5">
          <p className="app-muted text-sm font-bold">Valor destacado</p>

          <p className="app-brand-text mt-4 text-2xl font-black">
            R$ 2.450,00
          </p>

          <p className="app-muted mt-1 text-xs leading-5">
            Exemplo de valor importante no dashboard.
          </p>
        </div>
      </div>
    </section>
  );
}
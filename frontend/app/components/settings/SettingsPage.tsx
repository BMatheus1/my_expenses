"use client";

import { useEffect, useState } from "react";
import { AccountDeletionSection } from "../AccountDeletionSection";
import { NotificationSettingsPanel } from "../NotificationSettingsPanel";
import {
  APP_THEMES,
  type AppColorMode,
  type AppTheme,
  type AppThemeName,
  getSavedAppMode,
  getSavedAppTheme,
  initializeUserAppTheme,
  saveAndApplyAppMode,
  saveAndApplyAppTheme,
} from "@/app/lib/theme";
import {
  clearSensitiveBrowserData,
  getAutoLogoutEnabled,
  getAutoLogoutMinutes,
  getRememberSession,
  getSessionSecurityInfo,
  saveAutoLogoutEnabled,
  saveAutoLogoutMinutes,
  saveRememberSession,
} from "@/app/lib/security";
import type { User } from "@/app/types/auth";

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

const AUTO_LOGOUT_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
];

type SettingsSection = "appearance" | "security";

type SettingsPageProps = {
  section: SettingsSection;
  currentUser: User;
  onLogout: () => void;
};

export default function SettingsPage({
  section,
  currentUser,
  onLogout,
}: SettingsPageProps) {
  const [selectedTheme, setSelectedTheme] = useState<AppThemeName>("emerald");
  const [selectedMode, setSelectedMode] = useState<AppColorMode>("light");
  const [rememberSession, setRememberSession] = useState(true);
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(true);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(15);
  const [, refreshSessionInfo] = useState(0);

  const sessionInfo = getSessionSecurityInfo();

  useEffect(() => {
    initializeUserAppTheme(currentUser.id);
    setSelectedTheme(getSavedAppTheme(currentUser.id));
    setSelectedMode(getSavedAppMode(currentUser.id));
    setRememberSession(getRememberSession());
    setAutoLogoutEnabled(getAutoLogoutEnabled());
    setAutoLogoutMinutes(getAutoLogoutMinutes());
    refreshSessionInfo((currentValue) => currentValue + 1);
  }, [currentUser.id]);

  function handleThemeChange(theme: AppThemeName) {
    setSelectedTheme(theme);
    saveAndApplyAppTheme(theme, currentUser.id);
  }

  function handleModeChange(mode: AppColorMode) {
    setSelectedMode(mode);
    saveAndApplyAppMode(mode, currentUser.id);
  }

  function handleRememberSessionChange(value: boolean) {
    setRememberSession(value);
    saveRememberSession(value);
    refreshSessionInfo((currentValue) => currentValue + 1);
  }

  function handleAutoLogoutEnabledChange(value: boolean) {
    setAutoLogoutEnabled(value);
    saveAutoLogoutEnabled(value);
  }

  function handleAutoLogoutMinutesChange(value: number) {
    setAutoLogoutMinutes(value);
    saveAutoLogoutMinutes(value);
  }

  function handleClearSessionAndLogout() {
    clearSensitiveBrowserData();
    onLogout();
  }

  if (section === "security") {
    return (
      <section className="space-y-6">
        <SettingsHeader
          kicker="Segurança"
          title="Segurança da conta"
          description="Configure proteções importantes para a sessão do usuário e reduza riscos em computadores compartilhados."
        />

        <NotificationSettingsPanel currentUser={currentUser} />

        <section className="app-card rounded-3xl p-6">
          <SectionHeader
            title="Sessão e proteção local"
            description="Controle como sua sessão é armazenada neste navegador e quando o app deve sair automaticamente."
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <SecurityStatusCard
              currentUser={currentUser}
              sessionInfo={sessionInfo}
            />

            <div className="space-y-4 xl:col-span-2">
              <SecurityToggle
                title="Lembrar sessão neste navegador"
                description="Quando desativado, o token fica no sessionStorage e tende a sair ao fechar o navegador."
                isEnabled={rememberSession}
                onChange={handleRememberSessionChange}
              />

              <SecurityToggle
                title="Sair automaticamente por inatividade"
                description="Encerra a sessão local depois de um período sem cliques, teclado, rolagem ou toque."
                isEnabled={autoLogoutEnabled}
                onChange={handleAutoLogoutEnabledChange}
              />

              <div className="app-card-soft rounded-3xl p-5">
                <label className="app-title block text-sm font-black">
                  Tempo até sair por inatividade
                </label>

                <p className="app-muted mt-1 text-sm leading-6">
                  Use tempos menores em computadores compartilhados ou públicos.
                </p>

                <select
                  value={autoLogoutMinutes}
                  onChange={(event) =>
                    handleAutoLogoutMinutesChange(Number(event.target.value))
                  }
                  disabled={!autoLogoutEnabled}
                  className="mt-4 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--app-surface)",
                    borderColor: "var(--app-border)",
                    color: "var(--app-text)",
                  }}
                >
                  {AUTO_LOGOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                <h3 className="text-sm font-black">Sessão e dados locais</h3>

                <p className="mt-1 text-sm leading-6 opacity-80">
                  Remove tokens antigos do navegador e encerra o acesso neste
                  dispositivo. Seus lançamentos salvos no banco não são apagados.
                </p>

                <button
                  type="button"
                  onClick={handleClearSessionAndLogout}
                  className="mt-4 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
                >
                  Limpar sessão e sair
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="app-card rounded-3xl p-6">
          <SectionHeader
            title="Boas práticas para o usuário"
            description="Orientações simples para proteger a conta fora do código."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <SecurityTipCard
              icon="🔑"
              title="Senha forte"
              description="Use uma senha única, com letras, números e tamanho suficiente."
            />

            <SecurityTipCard
              icon="🧹"
              title="Computador público"
              description="Desative lembrar sessão e use limpar sessão ao terminar."
            />

            <SecurityTipCard
              icon="🛡️"
              title="Dados financeiros"
              description="Evite compartilhar prints com valores, e-mail ou informações pessoais."
            />
          </div>
        </section>
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-black text-stone-950">
              Segurança
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Gerencie as opções de segurança da sua conta.
            </p>
          </div>

          {/* outras opções de segurança aqui */}

          <AccountDeletionSection />
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <SettingsHeader
        kicker="Aparência"
        title="Aparência e tema"
        description="Personalize o visual do app, escolha o modo claro ou escuro e selecione uma paleta para toda a interface."
      />

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
          description="Escolha uma das paletas. Todos os botões, cards, destaques e estados ativos passam a usar a mesma identidade visual."
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

function SettingsHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <header className="app-card rounded-3xl p-6">
      <p className="app-kicker">{kicker}</p>

      <h1 className="app-title mt-2 text-3xl font-black tracking-tight">
        {title}
      </h1>

      <p className="app-muted mt-2 max-w-3xl text-sm leading-6">
        {description}
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

type SecurityStatusCardProps = {
  currentUser: User;
  sessionInfo: ReturnType<typeof getSessionSecurityInfo>;
};

function SecurityStatusCard({
  currentUser,
  sessionInfo,
}: SecurityStatusCardProps) {
  const storageLabel =
    sessionInfo.storageType === "memory"
      ? "Access token em memória"
      : sessionInfo.storageType === "localStorage"
        ? "Persistente neste navegador"
        : sessionInfo.storageType === "sessionStorage"
          ? "Somente nesta sessão"
          : "Sem sessão ativa";

  return (
    <div className="app-card-soft rounded-3xl p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl app-brand-soft text-lg font-black">
        🔐
      </div>

      <h3 className="app-title mt-4 text-lg font-black">Acesso atual</h3>

      <div className="mt-4 space-y-3 text-sm">
        <InfoRow label="Usuário" value={currentUser.name} />
        <InfoRow label="E-mail" value={currentUser.email} />
        <InfoRow label="Armazenamento" value={storageLabel} />
        <InfoRow
          label="Expira em"
          value={formatDateTime(sessionInfo.expiresAt) ?? "Não informado"}
        />
        <InfoRow
          label="Status"
          value={sessionInfo.isExpired ? "Expirada" : "Ativa"}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="app-muted text-xs font-bold uppercase tracking-wide">
        {label}
      </p>

      <p className="app-title mt-1 max-w-full overflow-hidden text-wrap font-black">
        {value}
      </p>
    </div>
  );
}

type SecurityToggleProps = {
  title: string;
  description: string;
  isEnabled: boolean;
  onChange: (value: boolean) => void;
};

function SecurityToggle({
  title,
  description,
  isEnabled,
  onChange,
}: SecurityToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!isEnabled)}
      className={`app-card-hover flex w-full items-center justify-between gap-4 rounded-3xl border p-5 text-left ${
        isEnabled ? "app-brand-border app-brand-ring" : ""
      }`}
    >
      <span>
        <span className="app-title block text-sm font-black">{title}</span>
        <span className="app-muted mt-1 block text-sm leading-6">
          {description}
        </span>
      </span>

      <span
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
          isEnabled ? "justify-end app-brand-soft" : "justify-start bg-stone-200"
        }`}
      >
        <span
          className="h-5 w-5 rounded-full bg-white shadow-sm"
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

function SecurityTipCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="app-card-soft rounded-3xl p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl app-brand-soft text-lg font-black">
        {icon}
      </div>

      <h3 className="app-title mt-4 text-sm font-black">{title}</h3>

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

function formatDateTime(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
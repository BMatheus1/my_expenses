"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { TIPOS_NEGOCIO } from "./businessConstants";
import type {
  BusinessFormState,
  DeleteBusinessMode,
  GoogleCredentialResponse,
} from "./businessTypes";
import {
  DangerButton,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  TextareaField,
} from "./BusinessShared";
import {
  getErrorMessage,
  getGoogleIdentityService,
  loadGoogleScript,
} from "./businessUtils";

export function EditBusinessModal({
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: BusinessFormState;
  saving: boolean;
  onChange: (form: BusinessFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title="Editar negócio" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <InputField
          label="Nome do negócio"
          value={form.name}
          onChange={(value) => onChange({ ...form, name: value })}
          required
        />

        <SelectField
          label="Tipo"
          value={form.type}
          onChange={(value) => onChange({ ...form, type: value })}
          options={TIPOS_NEGOCIO}
        />

        <TextareaField
          label="Descrição"
          value={form.description}
          onChange={(value) => onChange({ ...form, description: value })}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <SecondaryButton type="button" onClick={onClose}>
            Cancelar
          </SecondaryButton>

          <PrimaryButton disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteBusinessModal({
  businessName,
  mode,
  password,
  saving,
  googleEnabled,
  onModeChange,
  onPasswordChange,
  onClose,
  onSubmitPassword,
  onGoogleCredential,
}: {
  businessName: string;
  mode: DeleteBusinessMode;
  password: string;
  saving: boolean;
  googleEnabled: boolean;
  onModeChange: (mode: DeleteBusinessMode) => void;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmitPassword: (event: FormEvent<HTMLFormElement>) => void;
  onGoogleCredential: (credential: string) => void;
}) {
  return (
    <Modal title="Excluir negócio" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
          <p className="texto-quebra text-sm font-bold text-red-800">
            Você está prestes a excluir o negócio{" "}
            <span className="font-black">{businessName}</span>.
          </p>

          <p className="mt-2 texto-quebra text-sm text-red-700">
            Essa ação remove materiais, serviços, fichas e vendas desse negócio.
            Para sua segurança, confirme com senha ou conta Google.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onModeChange("password")}
            className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
              mode === "password"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            Confirmar com senha
          </button>

          <button
            type="button"
            onClick={() => onModeChange("google")}
            className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
              mode === "google"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            Confirmar com Google
          </button>
        </div>

        {mode === "password" ? (
          <form onSubmit={onSubmitPassword} className="space-y-4">
            <InputField
              label="Digite sua senha"
              type="password"
              value={password}
              onChange={onPasswordChange}
              required
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <SecondaryButton type="button" onClick={onClose}>
                Cancelar
              </SecondaryButton>

              <DangerButton type="submit" disabled={saving}>
                {saving ? "Excluindo..." : "Excluir negócio"}
              </DangerButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {!googleEnabled ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Login com Google não está configurado no frontend.
              </div>
            ) : (
              <GoogleDeleteButton
                disabled={saving}
                onCredential={onGoogleCredential}
              />
            )}

            <SecondaryButton type="button" onClick={onClose}>
              Cancelar
            </SecondaryButton>
          </div>
        )}
      </div>
    </Modal>
  );
}

function GoogleDeleteButton({
  disabled,
  onCredential,
}: {
  disabled: boolean;
  onCredential: (credential: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const renderedContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container || disabled) {
      return;
    }

    const buttonContainer = container;

    if (renderedContainerRef.current === buttonContainer) {
      return;
    }

    let active = true;

    async function renderGoogleButton() {
      try {
        const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

        if (!googleClientId) {
          setError("NEXT_PUBLIC_GOOGLE_CLIENT_ID não está configurado.");
          return;
        }

        await loadGoogleScript();

        if (!active) {
          return;
        }

        const googleId = getGoogleIdentityService();

        if (!googleId) {
          setError("Login com Google não foi carregado.");
          return;
        }

        googleId.initialize({
          client_id: googleClientId,
          callback: (response: GoogleCredentialResponse) => {
            if (!response.credential) {
              setError("Não foi possível confirmar a conta Google.");
              return;
            }

            onCredential(response.credential);
          },
        });

        googleId.renderButton(buttonContainer, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
        });

        renderedContainerRef.current = buttonContainer;
      } catch (error) {
        setError(getErrorMessage(error));
      }
    }

    renderGoogleButton();

    return () => {
      active = false;
    };
  }, [container, disabled, onCredential]);

  return (
    <div className="space-y-3">
      <div className="flex min-h-12 justify-center" ref={setContainer} />

      {disabled ? (
        <p className="text-center text-sm font-semibold text-stone-500">
          Confirmando...
        </p>
      ) : null}

      {error ? (
        <p className="texto-quebra rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
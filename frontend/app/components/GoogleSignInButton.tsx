"use client";

import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";

import { loginWithGoogle, setAuthToken } from "../lib/api";
import type { User } from "../types/auth";

type GoogleSignInButtonProps = {
  onAuthenticated: (user: User) => void;
  onError: (message: string) => void;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type NativeGoogleLoginResult = {
  provider?: string;
  result?: {
    idToken?: string | null;
    responseType?: "online" | "offline";
    profile?: {
      email?: string | null;
      name?: string | null;
      imageUrl?: string | null;
    };
  };
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme: "outline" | "filled_blue" | "filled_black";
              size: "large" | "medium" | "small";
              shape: "pill" | "rectangular" | "circle" | "square";
              width?: string;
              text?: "signin_with" | "signup_with" | "continue_with";
            },
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services-script";

let nativeGoogleInitializePromise: Promise<void> | null = null;

function isNativeApp() {
  return Capacitor.isNativePlatform();
}

function getGoogleWebClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
}

function getGoogleIosClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || "";
}

function getGoogleIosServerClientId() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_IOS_SERVER_CLIENT_ID?.trim() ||
    getGoogleWebClientId()
  );
}

async function initializeNativeGoogle() {
  if (nativeGoogleInitializePromise) {
    return nativeGoogleInitializePromise;
  }

  nativeGoogleInitializePromise = initializeNativeGoogleRequest();

  return nativeGoogleInitializePromise;
}

async function initializeNativeGoogleRequest() {
  const webClientId = getGoogleWebClientId();
  const iOSClientId = getGoogleIosClientId();
  const iOSServerClientId = getGoogleIosServerClientId();

  if (!webClientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.");
  }

  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  const googleConfig: {
    webClientId: string;
    iOSClientId?: string;
    iOSServerClientId?: string;
    mode: "online";
  } = {
    webClientId,
    mode: "online",
  };

  if (Capacitor.getPlatform() === "ios") {
    if (!iOSClientId) {
      throw new Error("NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID não configurado.");
    }

    googleConfig.iOSClientId = iOSClientId;
    googleConfig.iOSServerClientId = iOSServerClientId;
  }

  await SocialLogin.initialize({
    google: googleConfig,
  });
}

function extractNativeGoogleIdToken(response: NativeGoogleLoginResult) {
  const idToken = response.result?.idToken;

  if (!idToken) {
    throw new Error("Não foi possível receber o token do Google.");
  }

  return idToken;
}

export function GoogleSignInButton({
  onAuthenticated,
  onError,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);

  const [isNativePlatform] = useState(() => isNativeApp());
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const googleClientId = getGoogleWebClientId();

  useEffect(() => {
    if (isNativePlatform) {
      onError("");
    }
  }, [isNativePlatform, onError]);

  const authenticateWithCredential = useCallback(
    async (credential: string) => {
      const authResponse = await loginWithGoogle({
        credential,
      });

      setAuthToken(authResponse.access_token);
      onAuthenticated(authResponse.user);
    },
    [onAuthenticated],
  );

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      onError("");

      if (!response.credential) {
        onError("Não foi possível receber a credencial do Google.");
        return;
      }

      try {
        setIsAuthenticating(true);
        await authenticateWithCredential(response.credential);
      } catch (error) {
        console.error("Erro no login Google web:", error);

        onError(
          error instanceof Error
            ? error.message
            : "Não foi possível entrar com Google.",
        );
      } finally {
        setIsAuthenticating(false);
      }
    },
    [authenticateWithCredential, onError],
  );

  const handleNativeGoogleLogin = useCallback(async () => {
    onError("");

    try {
      setIsAuthenticating(true);

      await initializeNativeGoogle();

      const { SocialLogin } = await import("@capgo/capacitor-social-login");

      const response = (await SocialLogin.login({
        provider: "google",
        options: {
          scopes: ["email", "profile"],
          autoSelectEnabled: false,
          filterByAuthorizedAccounts: false,
        },
      })) as NativeGoogleLoginResult;

      const idToken = extractNativeGoogleIdToken(response);

      await authenticateWithCredential(idToken);
    } catch (error) {
      console.error("Erro no login Google nativo:", error);

      onError(
        error instanceof Error
          ? error.message
          : "Não foi possível entrar com Google.",
      );
    } finally {
      setIsAuthenticating(false);
    }
  }, [authenticateWithCredential, onError]);

  useEffect(() => {
    if (isNativePlatform || !googleClientId) {
      return;
    }

    if (window.google?.accounts?.id) {
      setIsScriptReady(true);
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => setIsScriptReady(true));
      return;
    }

    const script = document.createElement("script");

    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setIsScriptReady(true);
    script.onerror = () => {
      onError("Não foi possível carregar o login do Google.");
    };

    document.body.appendChild(script);
  }, [googleClientId, isNativePlatform, onError]);

  useEffect(() => {
    if (
      isNativePlatform ||
      !isScriptReady ||
      !buttonRef.current ||
      !window.google
    ) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
    });

    buttonRef.current.innerHTML = "";

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: "360",
      text: "continue_with",
    });
  }, [googleClientId, handleGoogleCredential, isNativePlatform, isScriptReady]);

  if (!googleClientId) {
    return (
      <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID para ativar login com Google.
      </p>
    );
  }

  if (isNativePlatform) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleNativeGoogleLogin}
          disabled={isAuthenticating}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-black text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white text-sm font-black">
            G
          </span>

          <span>
            {isAuthenticating ? "Entrando com Google..." : "Continuar com Google"}
          </span>
        </button>

        <p className="text-center text-xs leading-5 text-stone-500">
          Login seguro usando a conta Google configurada no dispositivo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isAuthenticating && (
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-800">
          Entrando com Google...
        </p>
      )}

      <div className="flex justify-center rounded-full border border-stone-200 bg-white p-2">
        <div ref={buttonRef} />
      </div>
    </div>
  );
}
"use client";

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
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services-script";

export function GoogleSignInButton({
  onAuthenticated,
  onError,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      onError("");

      if (!response.credential) {
        onError("Não foi possível receber a credencial do Google.");
        return;
      }

      try {
        setIsAuthenticating(true);

        const authResponse = await loginWithGoogle({
          credential: response.credential,
        });

        setAuthToken(authResponse.access_token);
        onAuthenticated(authResponse.user);
      } catch (error) {
        console.error("Erro no login Google:", error);

        onError(
          error instanceof Error
            ? error.message
            : "Não foi possível entrar com Google."
        );
      } finally {
        setIsAuthenticating(false);
      }
    },
    [onAuthenticated, onError]
  );

  useEffect(() => {
    if (!googleClientId) {
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
  }, [googleClientId, onError]);

  useEffect(() => {
    if (!isScriptReady || !buttonRef.current || !window.google) {
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
  }, [isScriptReady, googleClientId, handleGoogleCredential]);

  if (!googleClientId) {
    return (
      <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID para ativar login com Google.
      </p>
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
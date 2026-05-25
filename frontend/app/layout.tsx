import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Expenses",
  description: "Controle mensal simples de gastos.",
  applicationName: "My Expenses",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "My Expenses",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var availableThemes = [
      "emerald",
      "ocean",
      "royal",
      "violet",
      "rose",
      "sunset",
      "amber",
      "teal",
      "graphite",
      "midnight"
    ];

    var savedTheme = window.localStorage.getItem("my-expenses-theme");
    var savedMode = window.localStorage.getItem("my-expenses-color-mode");

    var theme = availableThemes.indexOf(savedTheme) >= 0 ? savedTheme : "emerald";
    var mode = savedMode === "dark" ? "dark" : "light";

    document.documentElement.dataset.appTheme = theme;
    document.documentElement.dataset.appMode = mode;
  } catch (error) {
    document.documentElement.dataset.appTheme = "emerald";
    document.documentElement.dataset.appMode = "light";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>

      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
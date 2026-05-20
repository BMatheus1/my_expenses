import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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
  icons: {   
    icon: [
      {
        url: "/logo.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
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
        <meta name="theme-color" content="#f8fafc" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>

      <body>{children}</body>
    </html>
  );
}
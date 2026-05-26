import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Expenses",
    template: "%s | My Expenses",
  },
  description:
    "Controle seus gastos, ganhos, cartões de crédito e negócios em um só lugar.",
  manifest: "/manifest.webmanifest",
  applicationName: "My Expenses",
  appleWebApp: {
    capable: true,
    title: "My Expenses",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/app-icon.svg",
    apple: "/icons/app-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
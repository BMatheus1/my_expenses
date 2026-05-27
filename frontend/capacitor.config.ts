import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.myexpensesfinance.app",
  appName: "My Expenses",
  webDir: "out",

  server: {
    hostname: "localhost",
    androidScheme: "https",
    appStartPath: "/app/",
  },

  android: {
    webContentsDebuggingEnabled: true,
  },
};

export default config;
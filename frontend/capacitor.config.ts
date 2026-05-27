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

  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
      logLevel: 1,
    },
  },
};

export default config;
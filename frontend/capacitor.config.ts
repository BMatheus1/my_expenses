import type { CapacitorConfig } from "@capacitor/cli";

const isNativeRelease = process.env.CAPACITOR_NATIVE_RELEASE === "true";

const config: CapacitorConfig = {
  appId: "com.myexpensesfinance.app",
  appName: "My Expenses",
  webDir: "out",
  backgroundColor: "#0c0a09",
  loggingBehavior: isNativeRelease ? "none" : "debug",

  server: {
    hostname: "localhost",
    androidScheme: "https",
    appStartPath: "/app/",
  },

  android: {
    backgroundColor: "#0c0a09",
    webContentsDebuggingEnabled: !isNativeRelease,
  },

  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_my_expenses",
      iconColor: "#0c0a09",
    },

    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
      logLevel: isNativeRelease ? 0 : 1,
    },
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rps.samajapp",
  appName: "Samaj",
  webDir: "dist",
  server: {
    // Allow HTTP API calls during local/dev (emulator / LAN backend).
    cleartext: true,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
  // Deep links / App Links handled in AndroidManifest + DeepLinkHandler
  // Host: https://web.suryavanshisamaj.online  |  Custom: samaj://app/...
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FBF9F8",
    },
    StatusBar: {
      // Dark/black icons on light bar (Capacitor: Style.DARK)
      style: "DARK",
      backgroundColor: "#FBF9F8",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;

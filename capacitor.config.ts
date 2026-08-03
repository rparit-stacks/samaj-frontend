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
    /**
     * Android 15+ forces edge-to-edge. "auto" adds WebView margins for system
     * bars when the theme does not opt out — keeps time/battery icons visible.
     */
    adjustMarginsForEdgeToEdge: "auto",
  },
  // Deep links / App Links handled in AndroidManifest + DeepLinkHandler
  // Host: https://web.suryavanshisamaj.online  |  Custom: samaj://app/...
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#000000",
    },
    StatusBar: {
      /**
       * Capacitor naming (Android):
       *   LIGHT = dark/black icons (for light backgrounds) ✓
       *   DARK  = light/white icons (for dark backgrounds)
       * Cream app bg → must use LIGHT or icons vanish on white bar.
       */
      style: "LIGHT",
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

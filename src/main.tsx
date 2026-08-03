import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

const STATUS_BAR_BG = "#FBF9F8";

async function applyStatusBar() {
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  // Content must not draw under the system bar (where still supported).
  await StatusBar.setOverlaysWebView({ overlay: false });
  await StatusBar.setBackgroundColor({ color: STATUS_BAR_BG });
  // Capacitor Style.Light = dark/black icons (needed on cream/light bar).
  // Style.Dark = white icons — invisible on #FBF9F8.
  await StatusBar.setStyle({ style: Style.Light });
}

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add("capacitor-native");
  document.documentElement.dataset.platform = Capacitor.getPlatform();

  const [{ SplashScreen }, { App: CapApp }, { Keyboard, KeyboardResize }] =
    await Promise.all([
      import("@capacitor/splash-screen"),
      import("@capacitor/app"),
      import("@capacitor/keyboard"),
    ]);

  try {
    await applyStatusBar();
  } catch {
    // ignore — some devices restrict status bar APIs
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    // ignore
  }

  CapApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      void applyStatusBar().catch(() => undefined);
    }
  });

  CapApp.addListener("resume", () => {
    void applyStatusBar().catch(() => undefined);
  });

  CapApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) {
      window.history.back();
    } else {
      void CapApp.exitApp();
    }
  });

  try {
    await SplashScreen.hide();
  } catch {
    // ignore
  }

  // After splash hides, plugins sometimes reset the bar — re-apply once more.
  window.setTimeout(() => {
    void applyStatusBar().catch(() => undefined);
  }, 400);
}

void initNativeShell();

createRoot(document.getElementById("root")!).render(<App />);

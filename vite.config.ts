import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    // Relative asset paths required for Capacitor (android/ios WebView).
    base: "./",
    server: {
      host: "::",
      port: 5173,
      // Backend API: set VITE_API_URL (e.g. http://localhost:9512) — default in api.ts uses hostname:8080
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

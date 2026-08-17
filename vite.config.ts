import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    // Web (Vercel) needs absolute asset paths so deep links like /admin/login resolve
    // assets from the site root. Capacitor's Android WebView needs relative paths
    // (file-based origin), so the "android" mode keeps base: "./" — see cap:sync script.
    base: mode === "android" ? "./" : "/",
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

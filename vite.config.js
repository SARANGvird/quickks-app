import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs/promises";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const clean = (v) => {
    if (!v) return "";
    return String(v).trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "").replace(/\s+/g, "").replace(/\/+$/, "");
  };

  const dedup = (u) => {
    if (!u) return u;
    return u
      .replace(/(\/api\/v1)(\/api\/v1)+/gi, "/api/v1")
      .replace(/\/quickks\/api\/v1\/api\/v1/gi, "/api/v1")
      .replace(/\/quickks\/api\/v1/gi, "/api/v1")
      .replace(/\/quickks$/i, "");
  };

  const rawApi = clean(env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || env.VITE_API_URL || "https://api.quickks.in");
  const apiBase = (() => {
    let url = dedup(rawApi) || "https://api.quickks.in";
    url = url.replace(/\/+$/, "");
    if (!/\/api\/v1$/i.test(url)) url = `${url}/api/v1`;
    return dedup(url);
  })();

  const apiOrigin = apiBase.replace(/\/api\/v1\/?$/i, "").replace(/\/+$/, "") || "https://api.quickks.in";
  const wsBase = clean(env.VITE_WS_URL || env.REACT_APP_WS_URL) || `${apiOrigin.replace(/^http/i, "ws").replace(/^ws:/i, "wss:").replace(/\/+$/, "")}/ws`;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt", "sitemap.xml"],
        manifest: {
          name: "Quickks - Trusted Home Services",
          short_name: "Quickks",
          theme_color: "#131921",
          background_color: "#ffffff",
          display: "standalone",
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            { urlPattern: /^https:\/\/api\.quickks\.in\/.*/i, handler: "NetworkFirst", options: { cacheName: "quickks-api", networkTimeoutSeconds: 8 } }
          ]
        }
      })
    ],
    server: { port: 3000, host: true, cors: true },
    build: {
      outDir: "dist",
      minify: "esbuild",
      target: "es2018",
      cssMinify: true,
      chunkSizeWarningLimit: 1200,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("src/api/api.js")) return "api-core";
            return null;
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        }
      }
    },
    esbuild: {
      loader: "jsx",
      include: /src\/.*\.jsx?$/,
      exclude: [],
      drop: mode === "production" ? ["console", "debugger"] : [],
      legalComments: "none"
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "@mui/material", "recharts", "axios", "@stomp/stompjs", "sockjs-client"],
      esbuildOptions: {
        plugins: [
          {
            name: "load-js-files-as-jsx",
            setup(build) {
              build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => {
                const contents = await fs.readFile(args.path, "utf8");
                return { loader: "jsx", contents };
              });
            }
          }
        ]
      }
    },
    define: {
      "process.env": {
        NODE_ENV: JSON.stringify(mode),
        REACT_APP_API_BASE_URL: JSON.stringify(apiBase),
        REACT_APP_API_URL: JSON.stringify(apiBase),
        REACT_APP_WS_URL: JSON.stringify(wsBase),
        REACT_APP_VERSION: JSON.stringify("69.0.0"),
        REACT_APP_ENABLE_DEBUG_LOGS: JSON.stringify("false"),
        VITE_API_BASE_URL: JSON.stringify(apiBase),
        VITE_WS_URL: JSON.stringify(wsBase)
      },
      "process.env.NODE_ENV": JSON.stringify(mode)
    }
  };
});
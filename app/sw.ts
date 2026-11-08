/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Descargas (PDF/XLSX) y todo lo de otros orígenes (URLs firmadas de adjuntos): nunca
    // a la caché del navegador. Workbox no respeta `Cache-Control: no-store`, así que hay
    // que excluirlos aquí (auditoría M1). El resto de páginas se limpia al cerrar sesión
    // (ver components/clear-session-caches.tsx).
    {
      matcher: ({ url, sameOrigin }) => !sameOrigin || url.pathname.includes("/export"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

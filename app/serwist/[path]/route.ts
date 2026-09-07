import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// El "revision" versiona la caché para que no se sirvan páginas precacheadas
// desactualizadas tras cada despliegue.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout ??
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/offline", revision }],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });

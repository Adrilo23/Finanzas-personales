import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import { STATIC_SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // No anunciar el framework en cada respuesta.
  poweredByHeader: false,
  // Cabeceras de seguridad fijas en todas las respuestas (también PDF, estáticos y
  // rutas fuera de proxy.ts). La CSP, que lleva nonce, la pone proxy.ts.
  async headers() {
    return [{ source: "/:path*", headers: STATIC_SECURITY_HEADERS }];
  },
};

export default withSerwist(nextConfig);

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/*
 * Static security headers for every response. The Content-Security-Policy is
 * NOT here: it carries a per-request nonce, so middleware.ts sets it.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny every powerful feature the site has no use for, in this document and in any frame.
  // Camera stays available to this origin only, after an explicit click in the face-inference lab.
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      ...["accelerometer", "bluetooth", "browsing-topics", "display-capture", "gamepad", "geolocation", "gyroscope", "hid", "idle-detection", "local-fonts", "magnetometer", "microphone", "midi", "payment", "publickey-credentials-get", "screen-wake-lock", "serial", "usb", "window-management", "xr-spatial-tracking"].map(
        (feature) => `${feature}=()`,
      ),
    ].join(", "),
  },
  // allow-popups: the encrypted contact bridge needs window.opener from its popup
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // jsdom reads its own files at runtime and must not be bundled (see lib/security/sanitize.ts)
  serverExternalPackages: ["jsdom"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/models/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

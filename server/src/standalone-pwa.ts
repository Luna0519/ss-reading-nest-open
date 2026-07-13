const SHELL_CACHE_VERSION = "v23";

export function handleStandaloneApp(
  request: Request,
  url: URL,
  token: string,
  widgetHtml: string
): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" }
    });
  }

  const basePath = `/app/${token}/`;
  if (url.pathname === basePath.slice(0, -1)) {
    const redirect = new URL(url);
    redirect.pathname = basePath;
    return Response.redirect(redirect, 308);
  }

  if (url.pathname === basePath) {
    return bodyResponse(request, buildStandaloneHtml(widgetHtml), {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    });
  }

  if (url.pathname === `${basePath}manifest.webmanifest`) {
    return bodyResponse(request, JSON.stringify(buildManifest(), null, 2), {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    });
  }

  if (url.pathname === `${basePath}sw.js`) {
    return bodyResponse(request, buildServiceWorker(), {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "private, no-cache",
      "Service-Worker-Allowed": basePath,
      "X-Content-Type-Options": "nosniff"
    });
  }

  if (url.pathname === `${basePath}icon.svg`) {
    return bodyResponse(request, buildIcon(), {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff"
    });
  }

  return new Response("Not found", { status: 404 });
}

export function buildStandaloneHtml(widgetHtml: string): string {
  const pwaHead = [
    '<meta name="sxs-standalone" content="true" />',
    '<meta name="theme-color" content="#f7efe8" />',
    '<meta name="application-name" content="L&L 共读小窝" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="L&L 共读小窝" />',
    '<link rel="manifest" href="./manifest.webmanifest" />',
    '<link rel="apple-touch-icon" href="./icon.svg" />'
  ].join("\n    ");
  const registration = `<script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(function () {});
        }, { once: true });
      }
    </script>`;
  return widgetHtml
    .replace("</head>", `    ${pwaHead}\n  </head>`)
    .replace("</body>", `    ${registration}\n  </body>`);
}

function buildManifest() {
  return {
    id: "./",
    name: "L&L 共读小窝",
    short_name: "L&L 共读",
    description: "属于我们的独立阅读小窝",
    lang: "zh-CN",
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: "any",
    background_color: "#f7efe8",
    theme_color: "#6f5148",
    icons: [
      {
        src: "./icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  };
}

function buildServiceWorker(): string {
  return `const CACHE_NAME = "ll-reading-nest-shell-${SHELL_CACHE_VERSION}";
const SHELL = ["./", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("ll-reading-nest-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("./")));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
`;
}

function buildIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="132" fill="#6f5148"/>
  <path d="M112 153c49-22 96-16 144 18 48-34 95-40 144-18v224c-48-18-95-10-144 26-49-36-96-44-144-26V153Z" fill="#f7efe8"/>
  <path d="M256 178v214" stroke="#cda99a" stroke-width="14" stroke-linecap="round"/>
  <text x="256" y="306" text-anchor="middle" font-family="system-ui,sans-serif" font-size="76" font-weight="800" fill="#6f5148">L&amp;L</text>
</svg>`;
}

function bodyResponse(request: Request, body: string, headers: HeadersInit): Response {
  return new Response(request.method === "HEAD" ? null : body, { headers });
}

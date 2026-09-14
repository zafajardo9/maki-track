import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.MAKI_SITE_URL ?? "http://localhost:3001"),
  title: {
    default: "MAKI - Project management for teams",
    template: "%s | MAKI",
  },
  description:
    "Bring projects, tasks, and conversations together. MAKI helps teams plan work, stay aligned, and deliver with confidence.",
  keywords: [
    "maki",
    "project management",
    "project planning",
    "kanban",
    "task management",
    "team productivity",
    "team collaboration",
  ],
  applicationName: "MAKI",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "MAKI",
    title: "MAKI - Project management for teams",
    description:
      "Bring projects, tasks, and conversations together. MAKI helps teams plan work, stay aligned, and deliver with confidence.",
  },
  twitter: {
    card: "summary",
    title: "MAKI - Project management for teams",
    description:
      "Bring projects, tasks, and conversations together. MAKI helps teams plan work, stay aligned, and deliver with confidence.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  category: "productivity",
  creator: "MAKI",
  publisher: "MAKI",
};

const siteUrl = process.env.MAKI_SITE_URL ?? "http://localhost:3001";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MAKI",
    url: siteUrl,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MAKI",
    url: siteUrl,
    inLanguage: "en",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MAKI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Linux, macOS, Windows",
    description:
      "Bring projects, tasks, and conversations together. MAKI helps teams plan work, stay aligned, and deliver with confidence.",
    url: siteUrl,
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: This is necessary to apply the user's preferred color scheme before React hydration to prevent a flash of incorrect theme.
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var media = window.matchMedia('(prefers-color-scheme: dark)');
                  function applyTheme(isDark) {
                    document.documentElement.classList.toggle('dark', isDark);
                    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                  }
                  applyTheme(media.matches);
                  if (media.addEventListener) {
                    media.addEventListener('change', function(e) { applyTheme(e.matches); });
                  } else if (media.addListener) {
                    media.addListener(function(e) { applyTheme(e.matches); });
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data must be inlined as a script tag for search engines to parse.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}

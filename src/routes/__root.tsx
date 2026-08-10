import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/blocks/Footer";
import { OdooLiveChat } from "@/components/chat/OdooLiveChat";
import { OrganizationSchema } from "@/components/schema/OrganizationSchema";
import { TrackingScripts } from "@/components/tracking/TrackingScripts";
import { ContactClickTracker } from "@/components/tracking/ContactClickTracker";
import { ClickIdCapture } from "@/components/tracking/ClickIdCapture";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Root-level meta. Per-route head() overrides title / description /
  // og:image where applicable; everything else inherits here. og:image
  // is a brand-default; routes with their own imagery override it.
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Interactive Displays Ireland — Digital Signage, Touchscreens & Kiosks" },
      {
        name: "description",
        content:
          "Interactive Displays Ireland (IDI) supplies, installs and supports LED and LCD digital signage, interactive touchscreens, outdoor displays, kiosks and LED video walls for retail, hospitality, education, healthcare and corporate clients across Ireland.",
      },
      { name: "author", content: "Interactive Displays Ireland" },
      { property: "og:title", content: "Interactive Displays Ireland" },
      {
        property: "og:description",
        content:
          "Digital signage, touchscreens and AV installation across Ireland — backed by a 3-year warranty, supported nationwide.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Interactive Displays Ireland" },
      { property: "og:locale", content: "en_IE" },
      {
        property: "og:image",
        content: `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie"}/brand/og-default.png`,
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Interactive Displays Ireland" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie"}/brand/og-default.png`,
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/brand/favicon.png" },
      { rel: "apple-touch-icon", href: "/brand/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <TrackingScripts />
        <OdooLiveChat />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Nav />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <OrganizationSchema />
        <ContactClickTracker />
        <ClickIdCapture />
      </div>
    </QueryClientProvider>
  );
}

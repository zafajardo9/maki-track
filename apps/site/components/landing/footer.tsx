import { Logo } from "@/components/landing/logo";
import { MAKI_APP_URL } from "@/lib/maki-app-url";

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-sidebar/70 px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="space-y-4 md:col-span-2">
            <a href="/" aria-label="MAKI home" className="inline-flex">
              <Logo />
            </a>
            <p className="max-w-sm text-balance text-muted-foreground text-sm">
              Focused project management, owned by your team.
            </p>
          </div>

          <div className="col-span-3 grid gap-6 sm:grid-cols-2">
            <div className="space-y-3 text-sm">
              <p className="font-medium">Product</p>
              <a
                className="block text-muted-foreground transition-colors hover:text-foreground"
                href={MAKI_APP_URL}
              >
                Open MAKI
              </a>
              <a
                className="block text-muted-foreground transition-colors hover:text-foreground"
                href="#features"
              >
                Features
              </a>
              <a
                className="block text-muted-foreground transition-colors hover:text-foreground"
                href="/guides"
              >
                Guides
              </a>
              <a
                className="block text-muted-foreground transition-colors hover:text-foreground"
                href="#why"
              >
                Why MAKI
              </a>
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-medium">Legal</p>
              <a
                className="block text-muted-foreground transition-colors hover:text-foreground"
                href="/privacy"
              >
                Privacy Policy
              </a>
              <a
                className="block text-muted-foreground transition-colors hover:text-foreground"
                href="/terms"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

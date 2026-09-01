import { MAKI_SIGN_UP_URL } from "@/lib/maki-app-url";
import { cn } from "@/lib/utils";

export function BlogCta({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-border/70 bg-card/70",
        compact ? "p-6" : "p-6 md:p-8",
      )}
    >
      <p
        className={cn(
          "text-balance font-medium leading-snug",
          compact ? "text-base" : "text-xl md:text-2xl",
        )}
      >
        Put your team on Maki Cloud
      </p>
      <p
        className={cn(
          "mt-2.5 text-foreground/70 leading-relaxed",
          compact ? "text-sm" : "",
        )}
      >
        Managed, EU-hosted project management from $4 a month. Automatic backups
        and updates, single sign-on, workspace roles, and email support, with
        none of the servers to look after.
      </p>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2.5",
          compact ? "mt-5" : "mt-6",
        )}
      >
        <a
          className={cn(
            "inline-flex items-center justify-center rounded-lg border border-transparent bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90",
            compact ? "h-10 w-full" : "h-10",
          )}
          href={MAKI_SIGN_UP_URL}
        >
          Start a 14-day free trial
        </a>
      </div>
      <p
        className={cn(
          "mt-3 text-foreground/50",
          compact ? "text-xs" : "text-xs",
        )}
      >
        No credit card required.
      </p>
    </aside>
  );
}

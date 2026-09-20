import type { Metadata } from "next";
import { FadeIn } from "@/components/landing/fade-in";
import { Footer } from "@/components/landing/footer";
import { breadcrumbJsonLd, JsonLd } from "@/components/landing/json-ld";
import { Navbar } from "@/components/landing/navbar";
import { formatBlogDate } from "@/lib/format-date";
import {
  goalEntries,
  goalStatusLabel,
  goalStatusOrder,
  timelineEntries,
  type UpdateKind,
} from "@/lib/updates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Updates",
  description:
    "Product updates, goals, and announcements from the Maki team: what shipped, what is in progress, and what is planned next.",
  alternates: { canonical: "/updates" },
};

const kindLabel: Record<Exclude<UpdateKind, "goal">, string> = {
  announcement: "Announcement",
  update: "Update",
};

function KindBadge({ kind }: { kind: Exclude<UpdateKind, "goal"> }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 font-medium text-xs",
        kind === "announcement"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/70 bg-accent/40 text-foreground/70",
      )}
    >
      {kindLabel[kind]}
    </span>
  );
}

export default function UpdatesPage() {
  const goals = goalEntries();
  const timeline = timelineEntries();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Maki", path: "/" },
          { name: "Updates", path: "/updates" },
        ])}
      />
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <section className="px-6 pt-14 pb-16 md:pt-20 md:pb-20">
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-2xl">
              <FadeIn delay={0}>
                <p className="font-medium text-primary text-sm">Updates</p>
              </FadeIn>
              <FadeIn delay={60}>
                <h1 className="mt-3 text-balance font-medium text-4xl leading-[1.06] md:text-5xl">
                  What's new and what's next
                </h1>
              </FadeIn>
              <FadeIn delay={120}>
                <p className="mt-5 text-balance text-foreground/70 text-lg leading-relaxed">
                  Shipped changes, product announcements, and the goals we're
                  working toward — all in one place.
                </p>
              </FadeIn>
            </div>

            {goals.length > 0 ? (
              <div className="mt-16">
                <FadeIn delay={0}>
                  <h2 className="font-medium text-2xl">Goals</h2>
                  <p className="mt-2 text-foreground/60 text-sm">
                    Where the product is heading. No dates promised — just an
                    honest view of what we're building.
                  </p>
                </FadeIn>
                <div className="mt-8 space-y-8">
                  {goalStatusOrder.map((status) => {
                    const items = goals.filter(
                      (goal) => goal.status === status,
                    );
                    if (items.length === 0) return null;
                    return (
                      <div key={status}>
                        <p className="font-medium text-foreground/50 text-xs uppercase tracking-wide">
                          {goalStatusLabel[status]}
                        </p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {items.map((goal) => (
                            <div
                              className="rounded-xl border border-border/70 bg-card/70 p-5"
                              key={goal.title}
                            >
                              <h3 className="text-balance font-medium text-base leading-snug">
                                {goal.title}
                              </h3>
                              <p className="mt-2 text-foreground/70 text-sm leading-relaxed">
                                {goal.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-16">
              <FadeIn delay={0}>
                <h2 className="font-medium text-2xl">
                  Updates &amp; announcements
                </h2>
              </FadeIn>
              <ol className="mt-8 space-y-6 border-l border-border/60 pl-6">
                {timeline.map((entry) => (
                  <li className="relative" key={`${entry.date}-${entry.title}`}>
                    <span
                      aria-hidden="true"
                      className="-left-[31px] absolute top-1.5 size-2.5 rounded-full border border-border bg-background"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-foreground/50 text-xs">
                      <KindBadge
                        kind={entry.kind as "announcement" | "update"}
                      />
                      <time dateTime={entry.date}>
                        {formatBlogDate(entry.date)}
                      </time>
                    </div>
                    <h3 className="mt-2 text-balance font-medium text-base leading-snug">
                      {entry.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-foreground/70 text-sm leading-relaxed">
                      {entry.body}
                    </p>
                    {entry.href ? (
                      <a
                        className="mt-2 inline-block font-medium text-primary text-sm hover:underline"
                        href={entry.href}
                      >
                        Read more
                      </a>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

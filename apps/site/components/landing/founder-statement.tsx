import { FadeIn } from "@/components/landing/fade-in";
import { Button } from "@/components/ui/button";
import { MAKI_SIGN_UP_URL } from "@/lib/maki-app-url";

export function FounderStatement() {
  return (
    <section id="why" className="scroll-mt-20 px-6 py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <p className="font-mono font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Why MAKI
          </p>
          <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-4xl">
            Less time coordinating. More time creating together.
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            A good project tool makes it easy to answer three questions: what
            matters, who’s working on it, and how it’s going. MAKI keeps those
            answers close, every day.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              [
                "Start with shared priorities",
                "Bring your team into a workspace, organize projects, and turn the next big idea into tasks everyone can act on.",
              ],
              [
                "Make handoffs easier",
                "Keep owners, conversations, and task details together so the next person has the context to pick things up.",
              ],
              [
                "Keep progress visible",
                "See what’s planned, what’s underway, and what’s done. Adjust priorities as your team’s work evolves.",
              ],
            ].map(([title, description]) => (
              <article className="border-t border-border pt-6" key={title}>
                <h3 className="font-medium text-base">{title}</h3>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </FadeIn>
        <div className="mt-16 flex flex-col items-start justify-between gap-8 rounded-2xl bg-primary p-8 text-primary-foreground md:mt-20 md:flex-row md:items-center md:p-12">
          <div className="max-w-xl">
            <h2 className="text-balance text-3xl font-semibold leading-tight">
              Bring your next project together.
            </h2>
            <p className="mt-3 text-primary-foreground/80 leading-relaxed">
              Give your team a shared place to start—and a clear way forward.
            </p>
          </div>
          <Button
            className="shrink-0 bg-background text-foreground hover:bg-background/90"
            render={<a href={MAKI_SIGN_UP_URL} />}
            size="lg"
          >
            Create your workspace
          </Button>
        </div>
      </div>
    </section>
  );
}

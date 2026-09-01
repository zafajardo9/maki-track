import { FadeIn } from "@/components/landing/fade-in";

export function FounderStatement() {
  return (
    <section id="why" className="px-6 py-16 md:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <p className="font-mono font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Why MAKI
          </p>
          <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-4xl">
            Project software should make the work clearer, not heavier.
          </h2>
        </FadeIn>
        <FadeIn delay={80}>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            MAKI keeps the essentials close and the infrastructure in your
            hands. Teams get a shared source of truth without adopting a second
            job just to maintain their project tool.
          </p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {[
              [
                "01 / Own the system",
                "Run MAKI on your infrastructure and keep project data in your PostgreSQL database.",
              ],
              [
                "02 / See the work",
                "Use clear boards, lists, priorities, and ownership without hiding progress behind configuration.",
              ],
              [
                "03 / Stay focused",
                "Every surface is designed to help work move forward, not to manufacture more process.",
              ],
            ].map(([title, description]) => (
              <article className="bg-background p-6 md:p-7" key={title}>
                <h3 className="font-mono font-medium text-xs uppercase tracking-[0.14em]">
                  {title}
                </h3>
                <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

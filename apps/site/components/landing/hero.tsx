"use client";

import { AppPreview } from "@/components/landing/app-preview";
import { FadeIn } from "@/components/landing/fade-in";
import { Button } from "@/components/ui/button";
import { MAKI_SIGN_UP_URL } from "@/lib/maki-app-url";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-14 pb-16 md:pt-20 md:pb-20 lg:pt-24">
      <div className="mx-auto w-full max-w-6xl">
        {/* ── Heading + description + buttons ── */}
        <div className="mb-10 max-w-2xl">
          <FadeIn delay={0}>
            <p className="mb-5 font-mono font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
              Project management for teams
            </p>
            <h1 className="text-balance text-4xl font-medium leading-[1.06] md:text-5xl lg:text-6xl">
              Great teamwork starts with a clear plan.
            </h1>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="mt-5 text-balance text-lg text-muted-foreground leading-relaxed md:text-xl">
              Bring projects, tasks, and conversations together. Give everyone a
              clear next step and keep your team moving from the first idea to
              the final delivery.
            </p>
          </FadeIn>

          <FadeIn delay={160}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                className="gap-2"
                render={<a href={MAKI_SIGN_UP_URL} />}
                size="lg"
              >
                Create your workspace
              </Button>
              <Button
                className="gap-2"
                render={<a href="#features" />}
                size="lg"
                variant="outline"
              >
                See how it works
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-muted-foreground text-xs uppercase tracking-[0.12em]">
              <span>Shared priorities</span>
              <span>Clear ownership</span>
              <span>Live updates</span>
            </div>
          </FadeIn>
        </div>

        {/* ── App preview: interactive mock of the real Maki UI ── */}
        <FadeIn delay={240} distance={32}>
          <AppPreview />
        </FadeIn>
      </div>
    </section>
  );
}

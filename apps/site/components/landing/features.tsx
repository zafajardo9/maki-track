import {
  CheckCircle2,
  GitPullRequest,
  MessageSquare,
  Users,
} from "lucide-react";
import { FadeIn } from "@/components/landing/fade-in";

const features = [
  {
    icon: Users,
    title: "Everyone knows what’s next",
    description:
      "Give every task an owner, set due dates, and agree on priorities so your team can get to work with confidence.",
  },
  {
    icon: MessageSquare,
    title: "Keep the conversation with the work",
    description:
      "Share feedback, decisions, and attachments right on the task. Keep the context your teammates need close at hand.",
  },
  {
    icon: GitPullRequest,
    title: "Connect planning to development",
    description:
      "Bring GitHub issues into your workflow so product and engineering can follow the same work from plan to release.",
  },
  {
    icon: CheckCircle2,
    title: "Stay up to date, together",
    description:
      "Follow progress with live updates and notifications. See what’s moving and where your team needs a hand.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative scroll-mt-20 bg-sidebar/55 px-6 py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <FadeIn>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-20">
            <div>
              <p className="font-mono font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
                Built for the way teams work
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight md:text-4xl">
                One place for the plan. A clear path to done.
              </h2>
              <p className="mt-5 text-muted-foreground text-base leading-relaxed">
                From a busy backlog to this week’s priorities, MAKI gives your
                team a shared view of the work and the details to move it
                forward.
              </p>
              <div className="mt-8 rounded-xl border border-border bg-background p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="rounded-md bg-muted px-3 py-1.5">To do</span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    →
                  </span>
                  <span className="rounded-md bg-info/10 px-3 py-1.5 text-info-foreground">
                    In progress
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    →
                  </span>
                  <span className="rounded-md bg-success/10 px-3 py-1.5 text-success-foreground">
                    Done
                  </span>
                </div>
                <h3 className="mt-5 text-sm font-medium">
                  Your workflow, in focus
                </h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Switch between boards and lists. Organize tasks with labels
                  and priorities. Keep everyone working from the same plan.
                </p>
              </div>
            </div>
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, description }) => (
                <article key={title} className="border-t border-border pt-6">
                  <Icon
                    aria-hidden="true"
                    className="mb-5 size-5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <h3 className="text-base font-medium">{title}</h3>
                  <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

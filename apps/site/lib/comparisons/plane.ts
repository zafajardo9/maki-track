import type { Comparison } from "./types";

export const plane: Comparison = {
  slug: "plane",
  competitor: "Plane",
  category: "open-source",
  title: "Plane alternative",
  description:
    "Maki is an MIT-licensed Plane alternative: smaller to run, permissively licensed, and with no commercial edition holding features back.",
  summary:
    "Smaller to run, MIT rather than AGPL, with simple email/password sign-in.",
  heading: "The lighter, MIT-licensed Plane alternative",
  subheading:
    "Plane is a capable open-source tracker with a Community edition and a Commercial edition above it. Maki has one edition, MIT licensed, and a much smaller install.",
  verdict:
    "Maki and Plane are both open-source, self-hostable project trackers. Plane's Community edition is AGPL-3.0 and free, with a separate Commercial edition and paid cloud tiers where single sign-on and advanced controls live. Maki is MIT licensed, uses email/password sign-in, and runs as one container plus PostgreSQL.",
  facts: {
    license: "MIT, versus AGPL-3.0 for the Plane Community edition",
    hosting: "Both self-host. Maki is a single container plus PostgreSQL",
    sso: "Email/password on Maki, Pro-tier SSO on Plane",
    pricing: "$0 self-hosted, cloud from $4 / month",
  },
  rows: [
    { feature: "License", maki: "MIT", them: "AGPL-3.0 (Community)" },
    { feature: "Self-hostable", maki: true, them: true },
    { feature: "Separate commercial edition", maki: false, them: true },
    { feature: "Email/password sign-in", maki: true, them: true },
    {
      feature: "Install footprint",
      maki: "One container + Postgres",
      them: "Multi-service",
    },
    { feature: "Cycles & modules", maki: false, them: true },
    { feature: "Time tracking", maki: true, them: "Paid tiers" },
    { feature: "Cloud pricing", maki: "From $4/mo", them: "From $6/seat/mo" },
  ],
  reasons: [
    {
      title: "One edition, no upgrade path to buy",
      body: "Plane splits into Community, Commercial, and Airgapped editions. Maki has one build, and everything in it is yours under MIT.",
    },
    {
      title: "Less to operate",
      body: "Maki is a container and a database. Plane's self-hosted stack has more services to run, monitor, and upgrade.",
    },
    {
      title: "Permissive licensing",
      body: "MIT rather than AGPL matters if you intend to modify Maki and offer it as part of a service. It removes the question entirely.",
    },
  ],
  honestNote:
    "Plane is the more feature-complete tracker: cycles, modules, intake, pages, and a polished interface, backed by a well-funded team shipping quickly. If you want a Linear-shaped open-source product and do not mind AGPL or a bigger install, Plane is an excellent choice.",
  faq: [
    {
      question: "Is Plane fully open source?",
      answer:
        "The Community edition is open source under AGPL-3.0 and free to self-host with no user limits. Plane also sells Commercial and Airgapped editions, and its cloud plans put single sign-on and advanced controls on paid tiers.",
    },
    {
      question: "Plane or Maki for a self-hosted team?",
      answer:
        "Plane if you want cycles, modules, SSO, and a broader feature set and can run a larger stack. Maki if you want MIT licensing, simple email/password sign-in, and the smallest install that still handles a team.",
    },
    {
      question: "Does AGPL matter for self-hosting?",
      answer:
        "For internal use, generally not. It matters if you modify the code and offer it to others over a network, where AGPL requires you to publish your changes. MIT has no such requirement.",
    },
    {
      question: "Can I migrate from Plane to Maki?",
      answer:
        "There is no dedicated importer yet. Both have APIs, and Maki supports per-project JSON import, so a scripted migration is feasible. Open a GitHub issue if you want it supported directly.",
    },
  ],
  related: ["linear", "huly", "jira", "openproject"],
  verifiedOn: "2026-08-19",
  sources: [{ label: "Plane pricing", href: "https://plane.so/pricing" }],
};

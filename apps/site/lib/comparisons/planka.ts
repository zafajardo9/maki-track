import type { Comparison } from "./types";

export const planka: Comparison = {
  slug: "planka",
  competitor: "PLANKA",
  category: "open-source",
  title: "A simpler, MIT-licensed PLANKA alternative",
  description:
    "Maki is an MIT-licensed PLANKA alternative with simple email/password authentication, built-in export, and an importer that moves your PLANKA boards over.",
  summary:
    "MIT licensed, with straightforward authentication and a PLANKA importer.",
  heading: "The deliberately simple PLANKA alternative",
  subheading:
    "PLANKA 2.2 moved SSO into its paid Pro tier. Maki takes a different approach: it is MIT-licensed, self-hostable, and deliberately limits interactive authentication to email and password.",
  verdict:
    "Maki is an MIT-licensed alternative to PLANKA with email/password sign-in. It has an importer that reads boards, lists, cards, labels, assignees, checklists, and comments straight from the PLANKA API, since PLANKA has no export of its own.",
  facts: {
    license: "MIT, versus PLANKA's source-available Fair Use licence",
    hosting: "Both self-host. Maki also offers an EU-hosted cloud",
    sso: "Email/password on Maki, OIDC on PLANKA Pro",
    pricing: "$0 self-hosted, cloud from $4 / month",
  },
  rows: [
    { feature: "License", maki: "MIT", them: "Fair Use (source-available)" },
    { feature: "Self-hostable", maki: true, them: true },
    { feature: "Own your data", maki: true, them: true },
    { feature: "Kanban boards", maki: true, them: true },
    {
      feature: "Authentication",
      maki: "Email/password",
      them: "Password; OIDC on Pro",
    },
    { feature: "Backlog & workflows", maki: true, them: false },
    { feature: "Data export", maki: "Built in", them: false },
    { feature: "Cloud pricing", maki: "From $4/mo", them: "Per user" },
  ],
  reasons: [
    {
      title: "Authentication stays simple",
      body: "Maki uses email and password for interactive sign-in. There are no social-provider credentials or identity-provider settings to configure.",
    },
    {
      title: "Genuinely MIT",
      body: "Maki is MIT end to end, with no Pro-only files carved out of the repository. You can fork it, run it, and change it without checking which licence a given file falls under.",
    },
    {
      title: "Your data stays portable",
      body: "Every project exports to JSON from the UI, and the whole API is public and documented. Getting out of Maki is as easy as getting in, which is rather the point.",
    },
  ],
  migration: {
    body: "PLANKA has no export feature, so we wrote an importer that reads your boards straight from its API and recreates them in Maki: lists, cards, labels, assignees, checklists, and comments. Start with a dry run, which writes nothing.",
    href: "https://kaneo.app/docs/core/migrations/from-planka",
    linkText: "Read the migration guide",
  },
  honestNote:
    "PLANKA is a good piece of software with a real team behind it, and paid tiers are a legitimate way to fund open-source work. If SSO is a requirement, PLANKA Pro is the better fit. Maki is for teams that prefer a smaller MIT-licensed system with email/password sign-in and built-in export.",
  faq: [
    {
      question: "Why did PLANKA move SSO behind a paid tier?",
      answer:
        "PLANKA 2.2 reorganised its editions and put OIDC single sign-on in the paid Pro tier. Self-hosters who had been signing in with OIDC found those accounts deactivated after upgrading. It is a legitimate way to fund the project, but it changes what the free build can do.",
    },
    {
      question: "How do I migrate from PLANKA to Maki?",
      answer:
        "Use the @maki/planka-import package. It reads boards from the PLANKA API with an API key and recreates them in Maki, including lists, cards, labels, assignees, checklists, and comments. Run it in dry-run mode first, which writes nothing.",
    },
    {
      question: "Is Maki's licence really MIT?",
      answer:
        "Yes, the whole repository is MIT with no source-available carve-outs and no separate enterprise directory. You can fork it, modify it, and run it commercially without checking which licence covers a given file.",
    },
    {
      question: "Does Maki have PLANKA's card features?",
      answer:
        "Maki has boards, lists as workflow columns, labels, assignees, due dates, priorities, comments, attachments, task relations, and time tracking, plus backlog planning that PLANKA does not have. Some PLANKA card details, such as its stopwatch UI, work differently.",
    },
  ],
  related: ["trello", "wekan", "kanboard", "vikunja"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "PLANKA pricing", href: "https://planka.app/pricing" },
    {
      label: "Maki migration guide",
      href: "/docs/core/migrations/from-planka",
    },
  ],
};

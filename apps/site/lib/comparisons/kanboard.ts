import type { Comparison } from "./types";

export const kanboard: Comparison = {
  slug: "kanboard",
  competitor: "Kanboard",
  category: "open-source",
  title: "Kanboard alternative",
  description:
    "Maki is an MIT-licensed Kanboard alternative with a modern interface, realtime boards, and team features included, still simple enough to self-host in minutes.",
  summary: "The same small footprint, with an interface people will open.",
  heading: "The Kanboard alternative with a modern interface",
  subheading:
    "Kanboard is admirably small and famously plain. Maki keeps the small footprint and gives your team something they will want to look at every day.",
  verdict:
    "Maki and Kanboard are both MIT-licensed and simple to self-host. Kanboard is a minimal PHP application that runs almost anywhere, including on SQLite. Maki is a modern React and PostgreSQL app with realtime boards, workspace roles, time tracking, integrations, and an optional managed cloud.",
  facts: {
    license: "MIT for both",
    hosting:
      "Kanboard is PHP with SQLite or MySQL. Maki is Docker plus PostgreSQL",
    sso: "Email/password on Maki, plugin-based OIDC on Kanboard",
    pricing: "$0 self-hosted for both, Maki Cloud from $4 / month",
  },
  rows: [
    { feature: "License", maki: "MIT", them: "MIT" },
    { feature: "Self-hostable", maki: true, them: true },
    { feature: "Interface", maki: "Modern", them: "Minimal" },
    { feature: "Realtime updates", maki: true, them: false },
    {
      feature: "Authentication",
      maki: "Email/password",
      them: "Password; OIDC via plugin",
    },
    { feature: "Backlog planning", maki: true, them: false },
    { feature: "Time tracking", maki: true, them: true },
    { feature: "Official cloud", maki: true, them: false },
  ],
  reasons: [
    {
      title: "Adoption, not just installation",
      body: "Kanboard installs in minutes and then people avoid opening it. Maki is built to be the tab your team actually keeps open.",
    },
    {
      title: "Team features in the core",
      body: "Workspaces, roles, notifications, and integrations come with Maki rather than arriving as separate plugins to keep updated. Sign-in uses email and password.",
    },
    {
      title: "Still small",
      body: "One container plus PostgreSQL, with a Helm chart if you are on Kubernetes. Maki is not the heavy option in this comparison.",
    },
  ],
  honestNote:
    "Kanboard's footprint is remarkable: PHP, an SQLite file if you want, and it will run happily on the cheapest VPS you own for years without attention. If minimal resource use and total simplicity are what you value, it is hard to beat.",
  faq: [
    {
      question: "Is Kanboard still maintained?",
      answer:
        "Yes. Kanboard is MIT licensed and still receives releases. Its design is deliberately conservative, and much of its extra functionality comes from community plugins.",
    },
    {
      question: "Kanboard or Maki for a small team?",
      answer:
        "Kanboard if you want the smallest possible install, plugin-based OIDC, and do not mind a plain interface. Maki if you want realtime boards, backlog planning, roles, and simple email/password sign-in.",
    },
    {
      question: "What are Maki's system requirements?",
      answer:
        "A small VPS is enough. Maki runs as a single container alongside PostgreSQL, and there is a Helm chart for Kubernetes deployments.",
    },
    {
      question: "Does Maki have a plugin system?",
      answer:
        "No. Maki extends through its public API, outgoing webhooks, API keys, and an MCP server rather than in-process plugins.",
    },
  ],
  related: ["wekan", "planka", "vikunja", "redmine"],
  verifiedOn: "2026-08-19",
  sources: [{ label: "Kanboard", href: "https://kanboard.org/" }],
};

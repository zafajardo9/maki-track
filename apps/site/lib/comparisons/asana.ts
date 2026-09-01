import type { Comparison } from "./types";

export const asana: Comparison = {
  slug: "asana",
  competitor: "Asana",
  category: "saas",
  title: "Open-source Asana alternative",
  description:
    "Maki is an open-source, self-hostable Asana alternative. Free to run on your own server under the MIT license, with simple email/password authentication and cloud plans from $4 a month.",
  summary: "No two-user free tier and no Enterprise gate on single sign-on.",
  heading: "The open-source Asana alternative",
  subheading:
    "Asana's free plan now stops at two people, and single sign-on only arrives at the Enterprise tier. Maki is open source, self-hostable, and gives every team the whole product.",
  verdict:
    "Maki is an open-source, MIT-licensed alternative to Asana that you can self-host for free with unlimited users. Asana is cloud-only, priced per user from $10.99 a month, and keeps SAML single sign-on for its Enterprise tier. Maki covers boards, backlog, workflows, roles, and time tracking, without Asana's portfolios, goals, or workload views.",
  facts: {
    license: "MIT, versus a proprietary licence for Asana",
    hosting: "Self-host anywhere, or EU-hosted cloud. Asana is cloud only",
    sso: "Email/password on Maki, Enterprise SSO on Asana",
    pricing: "$0 self-hosted, cloud from $4 / month",
  },
  rows: [
    { feature: "Open source (MIT)", maki: true, them: false },
    { feature: "Self-hostable", maki: true, them: false },
    { feature: "Own your data", maki: true, them: false },
    {
      feature: "Free tier",
      maki: "Unlimited, self-hosted",
      them: "Up to 2 users",
    },
    {
      feature: "Authentication",
      maki: "Email/password",
      them: "Password or Enterprise SSO",
    },
    { feature: "Time tracking", maki: true, them: "Paid tiers" },
    { feature: "Learning curve", maki: "Minutes", them: "Moderate" },
    {
      feature: "Cloud pricing",
      maki: "From $4/mo",
      them: "From $10.99/user/mo",
    },
  ],
  reasons: [
    {
      title: "The free tier is the whole product",
      body: "Self-hosted Maki has no seat cap and no feature gates. Asana's Personal plan tops out at two users and holds back timeline, forms, and automations.",
    },
    {
      title: "Single sign-on without a sales call",
      body: "Maki deliberately keeps interactive authentication to email and password. Asana also offers SAML on Enterprise, which is quote-only pricing.",
    },
    {
      title: "Work, not work management",
      body: "Maki gives you boards, a backlog, workflows, labels, and time tracking. There is no portfolio layer to maintain and no reporting suite to configure first.",
    },
  ],
  honestNote:
    "Asana is genuinely strong at cross-team coordination: portfolios, goals, workload balancing, and approval flows for a marketing or operations org. If a program manager needs to see fifty projects roll up into one status view, Asana does that and Maki does not.",
  faq: [
    {
      question: "Is there an open-source alternative to Asana?",
      answer:
        "Yes. Maki is MIT licensed and free to self-host with unlimited users. Other open-source options include OpenProject, Plane, Taiga, and Leantime. None of them replicate Asana's portfolio and goals layer, which is usually the point of switching.",
    },
    {
      question: "Can Asana be self-hosted?",
      answer:
        "No. Asana is a hosted SaaS product with no on-premise edition. If your requirement is keeping project data on infrastructure you control, you need a different tool.",
    },
    {
      question: "How many users does Asana's free plan allow?",
      answer:
        "Asana's Personal plan is limited to 2 users. Paid plans start at $10.99 per user a month billed annually for Starter and $24.99 for Advanced, with SAML SSO first appearing on Enterprise.",
    },
    {
      question: "Does Maki have time tracking like Asana?",
      answer:
        "Yes. Time entries are built into Maki tasks on every build, including the free self-hosted one. In Asana, time tracking is a paid-tier feature.",
    },
  ],
  related: ["clickup", "monday", "jira", "notion"],
  verifiedOn: "2026-08-19",
  sources: [{ label: "Asana pricing", href: "https://asana.com/pricing" }],
};

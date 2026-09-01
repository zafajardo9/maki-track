import type { Comparison } from "./types";

export const linear: Comparison = {
  slug: "linear",
  competitor: "Linear",
  category: "saas",
  title: "Open-source Linear alternative",
  description:
    "Maki is an open-source, self-hostable Linear alternative. A fast, focused issue tracker you can run on your own infrastructure under the MIT license.",
  summary: "A fast, focused tracker you can actually host yourself.",
  heading: "The open-source Linear alternative",
  subheading:
    "Linear is fast and beautifully focused, but it's closed-source, cloud-only, and you can't run it yourself. Maki gives you a clean, focused workflow that's open source and self-hostable.",
  verdict:
    "Maki is the closest open-source, self-hostable answer to Linear. It is MIT licensed, runs on your own Docker host, and keeps the same idea of a fast, uncluttered tracker with keyboard-friendly boards, backlog, and workflows. It does not try to reproduce Linear's cycles, triage, or insights.",
  facts: {
    license: "MIT, versus a proprietary licence for Linear",
    hosting: "Self-host anywhere, or EU-hosted cloud. Linear is cloud only",
    sso: "Email/password on Maki, paid-plan SSO on Linear",
    pricing: "$0 self-hosted, cloud from $4 / month",
  },
  rows: [
    { feature: "Open source (MIT)", maki: true, them: false },
    { feature: "Self-hostable", maki: true, them: false },
    { feature: "Own your data", maki: true, them: false },
    { feature: "Fast, focused UI", maki: true, them: true },
    { feature: "Free to self-host", maki: true, them: false },
    {
      feature: "Authentication",
      maki: "Email/password",
      them: "Password or paid-plan SSO",
    },
    { feature: "Cloud pricing", maki: "From $4/mo", them: "Per user" },
  ],
  reasons: [
    {
      title: "Clean and focused",
      body: "Maki is built around the same idea Linear popularized: a fast, uncluttered way to plan and execute, without the SaaS lock-in.",
    },
    {
      title: "Open and self-hostable",
      body: "Run Maki on your own infrastructure under the MIT license, keep your data in-house, and never depend on a vendor staying online.",
    },
    {
      title: "Honest pricing",
      body: "Free forever to self-host with every feature, including SSO. Managed cloud from $4/month, with no seats-gated features.",
    },
  ],
  honestNote:
    "Linear sets the bar for polish, speed, and deep product-team features like cycles and triage. If you're committed to cloud SaaS and want that specific, highly-refined workflow, it's excellent. Maki is for teams who want a clean experience they can actually own.",
  faq: [
    {
      question: "Can Linear be self-hosted?",
      answer:
        "No. Linear is a closed-source SaaS product with no self-hosted or on-premise edition. If running the tracker on your own infrastructure is a requirement, you need an open-source tool such as Maki, Plane, or Huly.",
    },
    {
      question: "What is the best open-source Linear alternative?",
      answer:
        "Maki, Plane, and Huly are the three usually named. Maki is MIT licensed and the smallest of the three to run and understand. Plane is AGPL and larger. Huly is EPL-2.0 and bundles chat, documents, and HR alongside tracking.",
    },
    {
      question: "Does Maki have keyboard shortcuts and a fast UI?",
      answer:
        "Yes. Maki is built as a single-page React app with realtime updates over WebSockets, so boards stay in sync without reloads. It is deliberately smaller in scope than Linear, which is what keeps it quick.",
    },
    {
      question: "How does Maki pricing compare to Linear?",
      answer:
        "Maki is free to self-host and uses email/password sign-in. Linear is priced per user with a free tier capped by issue count, and SSO on its paid plans.",
    },
  ],
  related: ["jira", "plane", "huly", "shortcut"],
  verifiedOn: "2026-08-19",
  sources: [{ label: "Linear pricing", href: "https://linear.app/pricing" }],
};

import type { Comparison } from "./types";

export const clickup: Comparison = {
  slug: "clickup",
  competitor: "ClickUp",
  category: "saas",
  title: "Open-source ClickUp alternative",
  description:
    "Maki is an open-source, self-hostable ClickUp alternative. All the planning you need, none of the feature sprawl, free to run yourself under the MIT license.",
  summary:
    "The planning part, without the docs, whiteboards, and chat you turn off anyway.",
  heading: "The open-source ClickUp alternative",
  subheading:
    "ClickUp's pitch is that it does everything. That is also the complaint. Maki does the part your team actually opens every morning, and you can run it on your own server.",
  verdict:
    "Maki is an open-source, MIT-licensed alternative to ClickUp that you can self-host for free with unlimited users. ClickUp is cloud-only, with paid tiers from $7 per user a month and SAML single sign-on on its higher tiers. Maki covers boards, backlog, workflows, labels, roles, and time tracking, and stops there on purpose.",
  facts: {
    license: "MIT, versus a proprietary licence for ClickUp",
    hosting: "Self-host anywhere, or EU-hosted cloud. ClickUp is cloud only",
    sso: "Email/password on Maki, Business-tier SSO on ClickUp",
    pricing: "$0 self-hosted, cloud from $4 / month",
  },
  rows: [
    { feature: "Open source (MIT)", maki: true, them: false },
    { feature: "Self-hostable", maki: true, them: false },
    { feature: "Own your data", maki: true, them: false },
    { feature: "Free tier storage", maki: "Your bucket", them: "60MB" },
    {
      feature: "Authentication",
      maki: "Email/password",
      them: "Password or Business SSO",
    },
    { feature: "Time tracking", maki: true, them: true },
    { feature: "Feature surface", maki: "Focused", them: "Very broad" },
    { feature: "Cloud pricing", maki: "From $4/mo", them: "From $7/user/mo" },
  ],
  reasons: [
    {
      title: "Fewer things to turn off",
      body: "ClickUp ships docs, whiteboards, chat, goals, and forms, and most teams spend their first week disabling them. Maki has one job and does not ask you to configure it.",
    },
    {
      title: "Storage on your terms",
      body: "ClickUp's free plan caps attachments at 60MB. Self-hosted Maki keeps attachments private in ImageKit, so the limit is whatever you configure.",
    },
    {
      title: "One product, one price",
      body: "Self-hosted Maki includes the complete project-management feature set and uses email/password sign-in. ClickUp adds Google SSO from its Business tier.",
    },
  ],
  honestNote:
    "ClickUp is remarkably capable if you genuinely want one tool for docs, whiteboards, chat, dashboards, and tasks, and you have someone willing to set it up properly. Maki will feel bare next to it. That is the trade being offered.",
  faq: [
    {
      question: "Is there a self-hosted alternative to ClickUp?",
      answer:
        "Yes. Maki, Plane, OpenProject, Vikunja, and Taiga can all be self-hosted. Maki is MIT licensed and runs as a single container with PostgreSQL, which makes it one of the simplest to keep online.",
    },
    {
      question: "Can ClickUp be self-hosted?",
      answer:
        "No. ClickUp is a cloud-only SaaS product. Enterprise customers get extra security controls, but there is no installable edition.",
    },
    {
      question: "What is ClickUp's free plan limited to?",
      answer:
        "The Free Forever plan has unlimited tasks and members but caps storage at 60MB and limits several features by usage. Paid tiers are $7 per user a month for Unlimited and $12 for Business, billed annually, with Google SSO on Business and custom SAML at the Enterprise level.",
    },
    {
      question: "Does Maki replace ClickUp Docs and Whiteboards?",
      answer:
        "No. Maki has task descriptions, comments, and attachments, but no document editor, whiteboard, or chat. If those are the reason you use ClickUp, Maki is not a like-for-like swap.",
    },
  ],
  related: ["asana", "monday", "notion", "plane"],
  verifiedOn: "2026-08-19",
  sources: [{ label: "ClickUp pricing", href: "https://clickup.com/pricing" }],
};

import type { Comparison } from "./types";

export const monday: Comparison = {
  slug: "monday",
  competitor: "monday.com",
  category: "saas",
  title: "Open-source monday.com alternative",
  description:
    "Maki is an open-source, self-hostable monday.com alternative with no seat minimums, simple email/password authentication, and free self-hosting under the MIT license.",
  summary:
    "No seat blocks, no three-board free tier, and simple email/password sign-in.",
  heading: "The open-source monday.com alternative",
  subheading:
    "monday.com sells seats in blocks, caps its free plan at two people and three boards, and keeps single sign-on for Enterprise. Maki is open source and charges nothing to run yourself.",
  verdict:
    "Maki is an open-source, self-hostable alternative to monday.com. It is MIT licensed, free to run on your own Docker host with unlimited users and boards, and its cloud starts at $4 a month with no seat minimums. monday.com is a broader work-OS with dashboards, forms, and CRM templates that Maki does not try to match.",
  facts: {
    license: "MIT, versus a proprietary licence for monday.com",
    hosting: "Self-host anywhere, or EU-hosted cloud. monday.com is cloud only",
    sso: "Email/password on Maki, Enterprise SSO on monday.com",
    pricing: "$0 self-hosted, cloud from $4 / month, no seat minimum",
  },
  rows: [
    { feature: "Open source (MIT)", maki: true, them: false },
    { feature: "Self-hostable", maki: true, them: false },
    { feature: "Own your data", maki: true, them: false },
    { feature: "Seat minimums", maki: "None", them: "Seats sold in blocks" },
    {
      feature: "Free tier",
      maki: "Unlimited, self-hosted",
      them: "2 seats, 3 boards",
    },
    {
      feature: "Authentication",
      maki: "Email/password",
      them: "Password or Enterprise SSO",
    },
    { feature: "Boards & workflows", maki: true, them: true },
    {
      feature: "Cloud pricing",
      maki: "From $4/mo",
      them: "Per seat, in blocks",
    },
  ],
  reasons: [
    {
      title: "You pay for the people you have",
      body: "monday.com sells seats in fixed blocks, so a team of six can end up buying ten. Maki Cloud bills the seats you actually use, and self-hosting bills nothing at all.",
    },
    {
      title: "No feature ladder",
      body: "Automations, integrations, and single sign-on sit on different monday.com tiers. Maki has one product: whichever way you run it, you get all of it.",
    },
    {
      title: "Simple on purpose",
      body: "Boards, backlog, workflow columns, labels, roles, and time tracking. Nothing to configure before your team can plan a week of work.",
    },
  ],
  honestNote:
    "monday.com is a work OS, not just a tracker. If you want dashboards, forms, CRM boards, and a marketplace of apps in one place, and you are happy paying per seat for it, it does far more than Maki. Maki is for teams who want a fast project tracker they can own.",
  faq: [
    {
      question: "Is there an open-source monday.com alternative?",
      answer:
        "Yes. Maki, OpenProject, Leantime, and Plane are all open source and self-hostable. Maki is the lightest of them to run: one container plus PostgreSQL, MIT licensed, with email/password sign-in.",
    },
    {
      question: "Can monday.com be self-hosted?",
      answer:
        "No. monday.com is cloud-only SaaS. Its Enterprise tier adds security and compliance controls, but there is no version you can install on your own servers.",
    },
    {
      question: "What does monday.com's free plan include?",
      answer:
        "The free plan is capped at 2 seats and 3 boards, with a limited set of views. Paid plans are per seat with minimum seat counts, and SSO arrives at the Enterprise tier.",
    },
    {
      question: "Does Maki have automations?",
      answer:
        "Maki has workflow rules per project, so tasks can move and update on defined triggers, plus outgoing webhooks and integrations with GitHub, Gitea, Slack, Discord, and Telegram. It is a smaller automation surface than monday.com's recipe builder.",
    },
  ],
  related: ["clickup", "asana", "wrike", "leantime"],
  verifiedOn: "2026-08-19",
  sources: [
    { label: "monday.com pricing", href: "https://monday.com/pricing" },
  ],
};

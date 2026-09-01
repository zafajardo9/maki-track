import type { Comparison } from "./types";

export const redmine: Comparison = {
  slug: "redmine",
  competitor: "Redmine",
  category: "open-source",
  title: "Modern Redmine alternative",
  description:
    "Maki is a modern, MIT-licensed Redmine alternative: the same self-hosted freedom with a current interface, simple email/password authentication, and no plugin archaeology.",
  summary: "The same self-hosted freedom with an interface from this decade.",
  heading: "The modern Redmine alternative",
  subheading:
    "Redmine has been quietly running teams for two decades, and it looks it. Maki is the same idea, self-hosted and free, with an interface from this decade.",
  verdict:
    "Maki is a modern, MIT-licensed alternative to Redmine. Both are free and self-hostable, but Redmine is a Rails application from 2006 whose kanban boards, single sign-on, and modern conveniences generally come from third-party plugins. Maki ships boards, workflows, email/password authentication, time tracking, and realtime updates as core features.",
  facts: {
    license: "MIT, versus GPLv2 for Redmine",
    hosting: "Both self-host. Maki is Docker plus PostgreSQL",
    sso: "Email/password on Maki, LDAP or plugins on Redmine",
    pricing: "$0 self-hosted for both, Maki Cloud from $4 / month",
  },
  rows: [
    { feature: "License", maki: "MIT", them: "GPLv2" },
    { feature: "Self-hostable", maki: true, them: true },
    { feature: "Kanban board built in", maki: true, them: "Plugin" },
    {
      feature: "Authentication",
      maki: "Email/password",
      them: "Plugin or LDAP",
    },
    { feature: "Realtime updates", maki: true, them: false },
    { feature: "Time tracking", maki: true, them: true },
    { feature: "Official cloud", maki: true, them: false },
    { feature: "Interface", maki: "Current", them: "Dated" },
  ],
  reasons: [
    {
      title: "No plugin archaeology",
      body: "A usable Redmine often means a stack of community plugins, each pinned to a Redmine version. Maki's boards, workflows, and email/password authentication are part of the product and upgrade with it.",
    },
    {
      title: "People will actually open it",
      body: "Redmine's interface is functional and unloved. Maki is a fast single-page app with realtime board updates, which matters when adoption is the hard part.",
    },
    {
      title: "A cloud option when you want one",
      body: "Redmine has no first-party hosting. Maki gives you the same MIT-licensed software either self-hosted or managed from $4 a month.",
    },
  ],
  honestNote:
    "Redmine is battle-tested, endlessly extensible, and still maintained, with an ecosystem covering almost anything through plugins. If you already run it, know its quirks, and depend on that ecosystem, there is no urgent reason to move. Maki is for teams starting fresh who want less to maintain.",
  faq: [
    {
      question: "Is Redmine still maintained?",
      answer:
        "Yes. Redmine is still actively developed and released under GPLv2, but its core interface and workflow model have changed little in years, and much of the modern functionality lives in third-party plugins.",
    },
    {
      question: "What is the best modern Redmine alternative?",
      answer:
        "Maki if you want something small, modern, and MIT licensed. OpenProject if you want a Redmine-descended platform with Gantt charts and enterprise support. Plane or Huly if you want a Linear-style interface.",
    },
    {
      question: "Does Maki support LDAP?",
      answer:
        "Maki supports email/password authentication only. It does not provide OIDC or a direct LDAP bind.",
    },
    {
      question: "Can I migrate Redmine issues to Maki?",
      answer:
        "There is no dedicated importer. Redmine has a REST API and Maki has a public API plus per-project JSON import, so a scripted migration is straightforward for someone comfortable with either API.",
    },
  ],
  related: ["openproject", "jira", "kanboard", "taiga"],
  verifiedOn: "2026-08-19",
  sources: [{ label: "Redmine", href: "https://www.redmine.org/" }],
};

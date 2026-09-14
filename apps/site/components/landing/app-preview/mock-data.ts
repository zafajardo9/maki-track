import type { ExternalLink } from "@/types/external-link";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";

// Extended task type – same base Task but with embedded labels and
// optional external links (just like the real API returns them).
export type TaskWithExtras = Task & {
  labels?: Array<{ id: string; name: string; color: string }>;
  externalLinks?: Array<ExternalLink>;
};

// ------------------------------------------------------------------
// Mock workspace
// ------------------------------------------------------------------
export const MOCK_WORKSPACE = {
  id: "ws-preview",
  name: "Acme Studio",
  slug: "acme-studio",
};

// ------------------------------------------------------------------
// Mock workspace labels
// ------------------------------------------------------------------
export const MOCK_WORKSPACE_LABELS = [
  { id: "lbl-1", name: "urgent", color: "#ef4444" },
  { id: "lbl-2", name: "product", color: "#6366f1" },
  { id: "lbl-3", name: "design", color: "#10b981" },
  { id: "lbl-4", name: "review", color: "#f59e0b" },
  { id: "lbl-5", name: "content", color: "#8b5cf6" },
];

// ------------------------------------------------------------------
// Mock users
// ------------------------------------------------------------------
export const MOCK_USERS = {
  members: [
    { userId: "u-1", user: { name: "Alex Morgan", image: null } },
    { userId: "u-2", user: { name: "Sam Rivera", image: null } },
    { userId: "u-3", user: { name: "Jordan Lee", image: null } },
    { userId: "u-4", user: { name: "Taylor Chen", image: null } },
  ],
};

// ------------------------------------------------------------------
// Helper timestamps / dates
// ------------------------------------------------------------------
const CREATED_AT = "2024-01-01T00:00:00.000Z";
const UPDATED_AT = "2024-07-01T00:00:00.000Z";

const d = (offset: number): string => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString();
};

// ------------------------------------------------------------------
// Project 1: Website launch
// ------------------------------------------------------------------
const SCR_ID = "p-1";
const WS_ID = "ws-preview";

const scrTasks: TaskWithExtras[] = [
  {
    id: "t-101",
    number: 1,
    title: "Design the new homepage",
    description:
      "Finalize the homepage layout, review the mobile designs, and share the handoff with engineering.",
    priority: "high",
    status: "in-progress",
    position: 1,
    startDate: d(-3),
    dueDate: d(2),
    userId: "u-1",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Alex Morgan",
    assigneeImage: null,
    labels: [{ id: "lbl-3", name: "design", color: "#10b981" }],
  },
  {
    id: "t-102",
    number: 2,
    title: "Build the signup flow",
    description:
      "Connect the signup screens, validate form states, and review the first-run experience.",
    priority: "medium",
    status: "in-progress",
    position: 2,
    startDate: d(1),
    dueDate: d(5),
    userId: "u-3",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Jordan Lee",
    assigneeImage: null,
    labels: [{ id: "lbl-2", name: "product", color: "#6366f1" }],
  },
  {
    id: "t-103",
    number: 3,
    title: "Finalize launch messaging",
    description:
      "Align the headline, product benefits, and launch announcement with the team.",
    priority: "urgent",
    status: "to-do",
    position: 1,
    startDate: d(-4),
    dueDate: d(-1),
    userId: "u-4",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Taylor Chen",
    assigneeImage: null,
    labels: [{ id: "lbl-1", name: "urgent", color: "#ef4444" }],
  },
  {
    id: "t-104",
    number: 4,
    title: "Check mobile accessibility",
    description:
      "Review keyboard navigation, touch targets, and contrast across the mobile layouts.",
    priority: "low",
    status: "to-do",
    position: 2,
    startDate: d(7),
    dueDate: d(14),
    userId: "u-2",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Sam Rivera",
    assigneeImage: null,
    labels: [],
  },
  {
    id: "t-105",
    number: 5,
    title: "Review the product walkthrough",
    description:
      "Collect feedback from design and product before publishing the walkthrough.",
    priority: "high",
    status: "in-review",
    position: 1,
    startDate: d(-1),
    dueDate: d(3),
    userId: "u-3",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Jordan Lee",
    assigneeImage: null,
    labels: [{ id: "lbl-4", name: "review", color: "#f59e0b" }],
  },
  {
    id: "t-106",
    number: 6,
    title: "Approve the visual direction",
    description:
      "Review typography, color, and page layouts with the team and document the agreed direction.",
    priority: "medium",
    status: "done",
    position: 1,
    startDate: d(18),
    dueDate: null,
    userId: "u-4",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Taylor Chen",
    assigneeImage: null,
    labels: [{ id: "lbl-3", name: "design", color: "#10b981" }],
  },
  {
    id: "t-107",
    number: 7,
    title: "Map the customer journey",
    description:
      "Outline the journey from first visit to an active workspace and identify key touchpoints.",
    priority: "medium",
    status: "done",
    position: 2,
    startDate: d(23),
    dueDate: null,
    userId: "u-2",
    projectId: SCR_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Sam Rivera",
    assigneeImage: null,
    labels: [{ id: "lbl-2", name: "product", color: "#6366f1" }],
  },
];

export const WEB_PROJECT: ProjectWithTasks = {
  id: SCR_ID,
  name: "Website launch",
  slug: "WEB",
  description:
    "Coordinate design, content, and engineering for the website launch.",
  icon: null,
  workspaceId: WS_ID,
  isPublic: false,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  columns: [
    {
      id: "to-do",
      name: "To Do",
      order: 0,
      isFinal: false,
      projectId: SCR_ID,
      tasks: scrTasks.filter((t) => t.status === "to-do"),
    },
    {
      id: "in-progress",
      name: "In Progress",
      order: 1,
      isFinal: false,
      projectId: SCR_ID,
      tasks: scrTasks.filter((t) => t.status === "in-progress"),
    },
    {
      id: "in-review",
      name: "In Review",
      order: 2,
      isFinal: false,
      projectId: SCR_ID,
      tasks: scrTasks.filter((t) => t.status === "in-review"),
    },
    {
      id: "done",
      name: "Done",
      order: 3,
      isFinal: true,
      projectId: SCR_ID,
      tasks: scrTasks.filter((t) => t.status === "done"),
    },
  ],
};

// ------------------------------------------------------------------
// Project 2: Customer onboarding
// ------------------------------------------------------------------
const TLM_ID = "p-2";

const tlmTasks: TaskWithExtras[] = [
  {
    id: "t-201",
    number: 1,
    title: "Create the welcome email",
    description:
      "Introduce the first steps, link to useful resources, and review the message with customer success.",
    priority: "high",
    status: "in-progress",
    position: 1,
    startDate: d(2),
    dueDate: d(7),
    userId: "u-1",
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Alex Morgan",
    assigneeImage: null,
    labels: [{ id: "lbl-5", name: "content", color: "#8b5cf6" }],
  },
  {
    id: "t-202",
    number: 2,
    title: "Write the getting-started guide",
    description:
      "Explain how to create a project, invite teammates, and plan the first week of work.",
    priority: "high",
    status: "to-do",
    position: 1,
    startDate: d(5),
    dueDate: d(10),
    userId: "u-4",
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Taylor Chen",
    assigneeImage: null,
    labels: [{ id: "lbl-5", name: "content", color: "#8b5cf6" }],
  },
  {
    id: "t-203",
    number: 3,
    title: "Review onboarding feedback",
    description:
      "Group customer feedback into themes and agree on the next improvements.",
    priority: "urgent",
    status: "in-review",
    position: 1,
    startDate: d(-2),
    dueDate: d(1),
    userId: "u-3",
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Jordan Lee",
    assigneeImage: null,
    labels: [
      { id: "lbl-4", name: "review", color: "#f59e0b" },
      { id: "lbl-5", name: "content", color: "#8b5cf6" },
    ],
  },
  {
    id: "t-204",
    number: 4,
    title: "Plan customer training sessions",
    description:
      "Prepare the agenda, confirm session times, and share the materials with the success team.",
    priority: "medium",
    status: "to-do",
    position: 2,
    startDate: d(15),
    dueDate: d(21),
    userId: null,
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    labels: [],
  },
  {
    id: "t-205",
    number: 5,
    title: "Publish the welcome checklist",
    description:
      "Create a short checklist that helps new teams reach their first project milestone.",
    priority: "medium",
    status: "done",
    position: 1,
    startDate: d(25),
    dueDate: null,
    userId: "u-3",
    projectId: TLM_ID,
    workspaceId: WS_ID,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    assigneeName: "Jordan Lee",
    assigneeImage: null,
    labels: [{ id: "lbl-5", name: "content", color: "#8b5cf6" }],
  },
];

export const MOB_PROJECT: ProjectWithTasks = {
  id: TLM_ID,
  name: "Customer onboarding",
  slug: "ONB",
  description:
    "Help new teams get started and build a repeatable onboarding experience.",
  icon: null,
  workspaceId: WS_ID,
  isPublic: false,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  columns: [
    {
      id: "to-do",
      name: "To Do",
      order: 0,
      isFinal: false,
      projectId: TLM_ID,
      tasks: tlmTasks.filter((t) => t.status === "to-do"),
    },
    {
      id: "in-progress",
      name: "In Progress",
      order: 1,
      isFinal: false,
      projectId: TLM_ID,
      tasks: tlmTasks.filter((t) => t.status === "in-progress"),
    },
    {
      id: "in-review",
      name: "In Review",
      order: 2,
      isFinal: false,
      projectId: TLM_ID,
      tasks: tlmTasks.filter((t) => t.status === "in-review"),
    },
    {
      id: "done",
      name: "Done",
      order: 3,
      isFinal: true,
      projectId: TLM_ID,
      tasks: tlmTasks.filter((t) => t.status === "done"),
    },
  ],
};

export const MOCK_PROJECTS: ProjectWithTasks[] = [WEB_PROJECT, MOB_PROJECT];

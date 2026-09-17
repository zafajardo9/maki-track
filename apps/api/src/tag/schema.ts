import { z } from "../openapi";

export const tagParam = z.object({ id: z.string() });

export const projectIdParam = z.object({ projectId: z.string() });

export const createTagBody = z.object({
  name: z.string().trim().min(1),
  color: z.string().trim().min(1),
  projectId: z.string(),
});

export const updateTagBody = z.object({
  name: z.string().trim().min(1),
  color: z.string().trim().min(1),
});

export const attachTagBody = z.object({ taskId: z.string() });

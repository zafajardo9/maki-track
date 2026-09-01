import { z } from "../openapi";

export const configSchema = z
  .object({
    disableRegistration: z.boolean(),
    disableWorkspaceCreation: z.boolean(),
    isDemoMode: z.boolean(),
    billingEnabled: z.boolean(),
  })
  .openapi("Config");

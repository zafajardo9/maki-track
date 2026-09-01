import { config } from "dotenv-mono";
import { isBillingEnabled } from "../billing/config";

config();

function getSettings() {
  return {
    disableRegistration: process.env.DISABLE_REGISTRATION === "true",
    disableWorkspaceCreation: process.env.DISABLE_WORKSPACE_CREATION === "true",
    isDemoMode: process.env.DEMO_MODE === "true",
    billingEnabled: isBillingEnabled(),
  };
}

export default getSettings;

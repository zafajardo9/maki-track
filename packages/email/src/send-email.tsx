import { render } from "@react-email/components";
import { config } from "dotenv-mono";
import { Resend } from "resend";
import { getResendSender, isResendConfigured } from "./resend-config";
import NotificationEmail, {
  type NotificationEmailProps,
} from "./templates/notification";
import PasswordResetEmail, {
  type PasswordResetEmailProps,
} from "./templates/password-reset";
import TrialReminderEmail, {
  type TrialReminderEmailProps,
} from "./templates/trial-reminder";
import WorkspaceInvitationEmail, {
  type WorkspaceInvitationEmailProps,
} from "./templates/workspace-invitation";

config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: getResendSender(),
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

export const sendPasswordResetEmail = async (
  to: string,
  subject: string,
  data: PasswordResetEmailProps,
) => {
  if (!isResendConfigured()) {
    console.warn(
      "Password reset requested but email was not sent because Resend is not configured",
    );
    return;
  }

  const emailTemplate = await render(PasswordResetEmail(data));
  try {
    await sendEmail(to, subject, emailTemplate);
  } catch (error) {
    console.error("Error sending password reset email", error);
  }
};

export type EmailResult = {
  success: boolean;
  reason?: "EMAIL_NOT_CONFIGURED";
};

export const sendWorkspaceInvitationEmail = async (
  to: string,
  subject: string,
  data: WorkspaceInvitationEmailProps,
): Promise<EmailResult> => {
  if (!isResendConfigured()) {
    return { success: false, reason: "EMAIL_NOT_CONFIGURED" };
  }

  try {
    const emailTemplate = await render(
      WorkspaceInvitationEmail({ ...data, to }),
    );
    await sendEmail(to, subject, emailTemplate);
    return { success: true };
  } catch (error) {
    console.error("Error sending workspace invitation email", error);
    throw error;
  }
};

export const sendNotificationEmail = async (
  to: string,
  subject: string,
  data: NotificationEmailProps,
): Promise<EmailResult> => {
  if (!isResendConfigured()) {
    return { success: false, reason: "EMAIL_NOT_CONFIGURED" };
  }

  try {
    const emailTemplate = await render(NotificationEmail(data));
    await sendEmail(to, subject, emailTemplate);
    return { success: true };
  } catch (error) {
    console.error("Error sending notification email", error);
    throw error;
  }
};

export const sendTrialReminderEmail = async (
  to: string,
  subject: string,
  data: TrialReminderEmailProps,
) => {
  const emailTemplate = await render(TrialReminderEmail(data));
  try {
    await sendEmail(to, subject, emailTemplate);
  } catch (error) {
    console.error("Error sending trial reminder email", error);
  }
};

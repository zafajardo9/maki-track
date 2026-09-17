import type { EmailResult } from "../../../packages/email/src/send-email";

export async function sendWorkspaceInvitationEmail(
  _to: string,
  _subject: string,
  _data: unknown,
): Promise<EmailResult> {
  return { success: true };
}

export function isResendConfigured(): boolean {
  return false;
}
